/**
 * Scheduling engine.
 *
 * A booking is a *plan*: one or more consecutive treatment segments. Each
 * segment needs one skilled staff member, one room of an allowed type and one
 * unit of every required equipment type for [start − bufferBefore,
 * end + bufferAfter]. A single service is a one-segment plan; the combo
 * "Pflege & Ruhe" is a two-segment plan, so a 120-minute chain can never slip
 * into a 60-minute gap.
 *
 * Availability = business opening hours ∩ staff shifts ∩ time off ∩ free
 * resources. Every write (hold, submit, approve, reschedule, manual create)
 * runs in one transaction behind a single booking lock, re-checks overlaps
 * against fresh data, and only then inserts allocations — two requests for
 * the same staff/room can never both win.
 */
import { and, eq, gt, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import type { Db, DbOrTx, Tx } from "./db";
import { schema } from "./db";
import { DomainError } from "./errors";
import { getOffer, getSettings, resolveVariant, type Settings } from "./catalog";
import {
  addDays,
  addMinutes,
  FOREVER,
  isoWeekday,
  isValidDateString,
  overlaps,
  timeToMinutes,
  toLocalParts,
  zonedToUtc,
} from "./time";
import { newId, newToken, seal, sha256 } from "./ids";
import type { AppointmentSnapshot, I18nText } from "./db/schema";
import { cancelQueuedJobs, enqueueAppointmentNotifications } from "./notifications/queue";
import { audit } from "./audit";

/* ------------------------------------------------------------------ plan */

export type PlanSegment = {
  serviceId: string;
  variantId: string;
  name: I18nText;
  minutes: number;
  priceCents: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  roomTypes: string[];
  equipmentTypes: string[];
  staffIds: string[];
};

export type BookingPlan = {
  segments: PlanSegment[];
  gapMinutes: number;
  totalCents: number;
  treatmentMinutes: number;
  offerId?: string;
  bookingMode: string; // manual_confirmation | instant | staff_scheduling_request
};

export type PlanInput = { serviceId?: string; variantId?: string; offerId?: string };

async function segmentFor(db: DbOrTx, serviceId: string, variantId: string): Promise<PlanSegment> {
  const { service, variant } = await resolveVariant(db, serviceId, variantId);
  const skills = await db
    .select({ staffId: schema.staffSkills.staffId })
    .from(schema.staffSkills)
    .innerJoin(schema.staff, eq(schema.staff.id, schema.staffSkills.staffId))
    .where(and(eq(schema.staffSkills.serviceId, serviceId), eq(schema.staff.active, true)));
  return {
    serviceId,
    variantId,
    name: service.name,
    minutes: variant.minutes,
    priceCents: variant.priceCents,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
    roomTypes: service.roomTypes,
    equipmentTypes: service.equipmentTypes,
    staffIds: skills.map((s) => s.staffId).sort(),
  };
}

export async function buildPlan(db: DbOrTx, input: PlanInput, now = new Date()): Promise<BookingPlan> {
  const settings = await getSettings(db);
  if (input.offerId) {
    const found = await getOffer(db, input.offerId, now);
    if (!found) throw new DomainError("offer_not_found", 404);
    if (!found.current) throw new DomainError("offer_expired", 409);
    const segments = [];
    for (const c of found.offer.components) segments.push(await segmentFor(db, c.serviceId, c.variantId));
    return {
      segments,
      gapMinutes: settings.comboBufferMinutes,
      totalCents: found.offer.priceCents,
      treatmentMinutes: segments.reduce((sum, s) => sum + s.minutes, 0),
      offerId: found.offer.id,
      bookingMode: found.offer.bookingMode,
    };
  }
  if (!input.serviceId || !input.variantId) throw new DomainError("invalid_plan");
  const { service } = await resolveVariant(db, input.serviceId, input.variantId);
  if (!service.bookable) throw new DomainError("service_not_bookable", 409);
  const segment = await segmentFor(db, input.serviceId, input.variantId);
  return {
    segments: [segment],
    gapMinutes: 0,
    totalCents: segment.priceCents,
    treatmentMinutes: segment.minutes,
    bookingMode: settings.bookingMode,
  };
}

/* --------------------------------------------------------------- context */

type Rule = { startMin: number; endMin: number; weekday: number };
type Busy = { resourceId: string | null; startsAt: Date; endsAt: Date };

export type Context = {
  settings: Settings;
  tz: string;
  now: Date;
  staffResource: Map<string, string>; // staffId → resourceId
  rooms: { id: string; type: string | null }[];
  equipment: { id: string; type: string | null }[];
  rules: Map<string, Rule[]>; // resourceId or "business"
  timeOff: Busy[];
  allocations: Busy[];
};

export const staffResourceId = (staffId: string) => `staff:${staffId}`;

export async function loadContext(
  db: DbOrTx,
  from: Date,
  to: Date,
  opts: { now?: Date; excludeHoldId?: string; excludeAppointmentId?: string } = {},
): Promise<Context> {
  const now = opts.now ?? new Date();
  const settings = await getSettings(db);
  const resources = await db.select().from(schema.resources).where(eq(schema.resources.active, true));
  const staffRows = await db.select().from(schema.staff).where(eq(schema.staff.active, true));
  const ruleRows = await db.select().from(schema.availabilityRules);
  const offRows = await db
    .select()
    .from(schema.timeOff)
    .where(and(lt(schema.timeOff.startsAt, to), gt(schema.timeOff.endsAt, from)));

  const allocConds = [
    isNull(schema.resourceAllocations.releasedAt),
    gt(schema.resourceAllocations.blocksUntil, now),
    lt(schema.resourceAllocations.startsAt, to),
    gt(schema.resourceAllocations.endsAt, from),
  ];
  if (opts.excludeHoldId) {
    allocConds.push(or(isNull(schema.resourceAllocations.holdId), ne(schema.resourceAllocations.holdId, opts.excludeHoldId))!);
  }
  if (opts.excludeAppointmentId) {
    allocConds.push(
      or(isNull(schema.resourceAllocations.appointmentId), ne(schema.resourceAllocations.appointmentId, opts.excludeAppointmentId))!,
    );
  }
  const allocRows = await db.select().from(schema.resourceAllocations).where(and(...allocConds));

  const rules = new Map<string, Rule[]>();
  for (const r of ruleRows) {
    const key = r.resourceId ?? "business";
    const list = rules.get(key) ?? [];
    list.push({ weekday: r.weekday, startMin: timeToMinutes(r.startTime), endMin: timeToMinutes(r.endTime) });
    rules.set(key, list);
  }

  const activeResourceIds = new Set(resources.map((r) => r.id));
  return {
    settings,
    tz: settings.timezone,
    now,
    staffResource: new Map(
      staffRows.filter((s) => activeResourceIds.has(staffResourceId(s.id))).map((s) => [s.id, staffResourceId(s.id)]),
    ),
    rooms: resources.filter((r) => r.kind === "room").map((r) => ({ id: r.id, type: r.type })).sort((a, b) => a.id.localeCompare(b.id)),
    equipment: resources.filter((r) => r.kind === "equipment").map((r) => ({ id: r.id, type: r.type })).sort((a, b) => a.id.localeCompare(b.id)),
    rules,
    timeOff: offRows.map((o) => ({ resourceId: o.resourceId, startsAt: o.startsAt, endsAt: o.endsAt })),
    allocations: allocRows.map((a) => ({ resourceId: a.resourceId, startsAt: a.startsAt, endsAt: a.endsAt })),
  };
}

/** Is [start,end) fully inside one rule interval of that local day? */
function coveredByRules(ctx: Context, key: string, start: Date, end: Date, required: boolean): boolean {
  const list = ctx.rules.get(key);
  if (!list || list.length === 0) return !required;
  const s = toLocalParts(start, ctx.tz);
  const e = toLocalParts(addMinutes(end, -1), ctx.tz); // inclusive last minute
  if (s.date !== e.date) return false;
  const endMin = e.minutes + 1;
  return list.some((r) => r.weekday === s.weekday && r.startMin <= s.minutes && endMin <= r.endMin);
}

/* ------------------------------------------------------------ assignment */

export type SegmentAssignment = {
  serviceId: string;
  variantId: string;
  startsAt: Date;
  endsAt: Date;
  blockStart: Date;
  blockEnd: Date;
  staffId: string;
  roomId: string;
  equipmentIds: string[];
};

export type Assignment = { startsAt: Date; endsAt: Date; segments: SegmentAssignment[] };

export function tryAssign(ctx: Context, plan: BookingPlan, start: Date, preferredStaffId?: string | null): Assignment | null {
  const picked: Busy[] = [];
  const result: SegmentAssignment[] = [];
  let cursor = start;

  const isFree = (resourceId: string, from: Date, to: Date) =>
    !ctx.timeOff.some((t) => t.resourceId === resourceId && overlaps(t.startsAt, t.endsAt, from, to)) &&
    !ctx.allocations.some((a) => a.resourceId === resourceId && overlaps(a.startsAt, a.endsAt, from, to)) &&
    !picked.some((p) => p.resourceId === resourceId && overlaps(p.startsAt, p.endsAt, from, to));

  for (let i = 0; i < plan.segments.length; i++) {
    const seg = plan.segments[i];
    const tStart = cursor;
    const tEnd = addMinutes(tStart, seg.minutes);
    const bStart = addMinutes(tStart, -seg.bufferBeforeMinutes);
    const bEnd = addMinutes(tEnd, seg.bufferAfterMinutes);

    // The treatment itself happens inside opening hours; the studio is not closed.
    if (!coveredByRules(ctx, "business", tStart, tEnd, true)) return null;
    if (ctx.timeOff.some((t) => t.resourceId === null && overlaps(t.startsAt, t.endsAt, bStart, bEnd))) return null;

    let staffCandidates = seg.staffIds.filter((id) => ctx.staffResource.has(id));
    if (preferredStaffId) {
      if (plan.segments.length === 1 || seg.staffIds.includes(preferredStaffId)) {
        staffCandidates = staffCandidates.filter((id) => id === preferredStaffId);
      }
    }
    const staffId = staffCandidates.find((id) => {
      const rid = ctx.staffResource.get(id)!;
      return coveredByRules(ctx, rid, bStart, bEnd, true) && isFree(rid, bStart, bEnd);
    });
    if (!staffId) return null;

    const room = ctx.rooms.find(
      (r) => r.type && seg.roomTypes.includes(r.type) && coveredByRules(ctx, r.id, bStart, bEnd, false) && isFree(r.id, bStart, bEnd),
    );
    if (!room) return null;

    const equipmentIds: string[] = [];
    for (const type of seg.equipmentTypes) {
      const unit = ctx.equipment.find((e) => e.type === type && isFree(e.id, bStart, bEnd) && !equipmentIds.includes(e.id));
      if (!unit) return null;
      equipmentIds.push(unit.id);
    }

    const staffRid = ctx.staffResource.get(staffId)!;
    for (const rid of [staffRid, room.id, ...equipmentIds]) picked.push({ resourceId: rid, startsAt: bStart, endsAt: bEnd });
    result.push({ serviceId: seg.serviceId, variantId: seg.variantId, startsAt: tStart, endsAt: tEnd, blockStart: bStart, blockEnd: bEnd, staffId, roomId: room.id, equipmentIds });

    const next = plan.segments[i + 1];
    if (next) cursor = addMinutes(tEnd, Math.max(seg.bufferAfterMinutes, plan.gapMinutes) + next.bufferBeforeMinutes);
  }

  return { startsAt: result[0].startsAt, endsAt: result[result.length - 1].endsAt, segments: result };
}

/* ---------------------------------------------------------- availability */

export type Slot = { time: string; startsAt: string };
export type DayAvailability = { date: string; slots: Slot[]; closed: boolean };

function dayBounds(date: string, tz: string) {
  const from = zonedToUtc(date, "00:00", tz) ?? new Date(`${date}T00:00:00Z`);
  const to = zonedToUtc(addDays(date, 1), "00:00", tz) ?? new Date(`${addDays(date, 1)}T00:00:00Z`);
  return { from, to };
}

export function todayLocal(tz: string, now = new Date()) {
  return toLocalParts(now, tz).date;
}

function slotsForDay(ctx: Context, plan: BookingPlan, date: string, staffId?: string | null): DayAvailability {
  const weekday = isoWeekday(date);
  const intervals = (ctx.rules.get("business") ?? []).filter((r) => r.weekday === weekday);
  const today = todayLocal(ctx.tz, ctx.now);
  const lastDay = addDays(today, ctx.settings.bookingHorizonDays);
  if (intervals.length === 0) return { date, slots: [], closed: true };
  if (date < today || date > lastDay) return { date, slots: [], closed: false };

  const earliest = addMinutes(ctx.now, ctx.settings.minLeadMinutes);
  const step = ctx.settings.slotStepMinutes;
  const slots: Slot[] = [];
  for (const interval of intervals.sort((a, b) => a.startMin - b.startMin)) {
    for (let m = interval.startMin; m + plan.treatmentMinutes <= interval.endMin; m += step) {
      const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const start = zonedToUtc(date, time, ctx.tz);
      if (!start || start < earliest) continue;
      if (tryAssign(ctx, plan, start, staffId)) slots.push({ time, startsAt: start.toISOString() });
    }
  }
  return { date, slots, closed: false };
}

export async function getAvailability(
  db: DbOrTx,
  input: PlanInput & { from: string; days?: number; staffId?: string | null },
  now = new Date(),
): Promise<{ plan: BookingPlan; days: DayAvailability[]; staff: { id: string; name: string }[] }> {
  if (!isValidDateString(input.from)) throw new DomainError("invalid_date");
  const days = Math.min(Math.max(input.days ?? 1, 1), 42);
  const plan = await buildPlan(db, input, now);
  const settings = await getSettings(db);
  const start = dayBounds(input.from, settings.timezone).from;
  const end = dayBounds(addDays(input.from, days - 1), settings.timezone).to;
  const ctx = await loadContext(db, start, end, { now });
  const result: DayAvailability[] = [];
  for (let i = 0; i < days; i++) result.push(slotsForDay(ctx, plan, addDays(input.from, i), input.staffId));

  const staffRows = await db.select().from(schema.staff).where(eq(schema.staff.active, true));
  const skilledEverywhere = staffRows.filter((s) => plan.segments.every((seg) => seg.staffIds.includes(s.id)));
  return { plan, days: result, staff: skilledEverywhere.map((s) => ({ id: s.id, name: s.displayName })) };
}

/* ----------------------------------------------------------------- locks */

/**
 * One booking lock for the whole studio. A spa books a handful of requests a
 * minute; serialising writes is cheap and removes every lost-update race. The
 * overlap re-check inside the lock is what guarantees no double booking.
 */
export async function lockBooking(tx: Tx) {
  await tx.execute(sql`SELECT id FROM business_settings WHERE id = 1 FOR UPDATE`);
}

async function insertAllocations(tx: Tx, assignment: Assignment, ref: { holdId?: string; appointmentId?: string }, blocksUntil: Date) {
  const rows = assignment.segments.flatMap((seg) =>
    [staffResourceId(seg.staffId), seg.roomId, ...seg.equipmentIds].map((resourceId) => ({
      id: newId("al"),
      resourceId,
      startsAt: seg.blockStart,
      endsAt: seg.blockEnd,
      holdId: ref.holdId ?? null,
      appointmentId: ref.appointmentId ?? null,
      blocksUntil,
    })),
  );
  await tx.insert(schema.resourceAllocations).values(rows);
}

function parseStart(settings: Settings, date: string, time: string, now: Date) {
  if (!isValidDateString(date) || !/^\d{2}:\d{2}$/.test(time)) throw new DomainError("invalid_date");
  const start = zonedToUtc(date, time, settings.timezone);
  if (!start) throw new DomainError("slot_unavailable", 409);
  if (start < now) throw new DomainError("slot_in_past", 409);
  return start;
}

/* ----------------------------------------------------------------- holds */

type HoldPayload = { plan: BookingPlan; assignment: Assignment; staffPreference: string | null };

export async function createHold(
  db: Db,
  input: PlanInput & { date: string; time: string; staffId?: string | null },
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    await lockBooking(tx);
    const settings = await getSettings(tx);
    const plan = await buildPlan(tx, input, now);
    if (plan.bookingMode === "staff_scheduling_request") throw new DomainError("offer_requires_request", 409);
    const start = parseStart(settings, input.date, input.time, now);
    if (start < addMinutes(now, settings.minLeadMinutes)) throw new DomainError("slot_unavailable", 409);
    if (input.date > addDays(todayLocal(settings.timezone, now), settings.bookingHorizonDays)) throw new DomainError("slot_unavailable", 409);

    const { from, to } = dayBounds(input.date, settings.timezone);
    const ctx = await loadContext(tx, from, to, { now });
    const assignment = tryAssign(ctx, plan, start, input.staffId);
    if (!assignment) throw new DomainError("slot_unavailable", 409);

    const token = newToken();
    const holdId = newId("hold");
    const expiresAt = addMinutes(now, settings.holdTtlMinutes);
    const payload: HoldPayload = { plan, assignment, staffPreference: input.staffId ?? null };
    await tx.insert(schema.bookingHolds).values({ id: holdId, tokenHash: sha256(token), plan: payload, startsAt: start, expiresAt });
    await insertAllocations(tx, assignment, { holdId }, expiresAt);
    return { holdToken: token, holdId, expiresAt, startsAt: assignment.startsAt, endsAt: assignment.endsAt, totalCents: plan.totalCents };
  });
}

export async function releaseHold(db: Db, holdToken: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const [hold] = await tx.select().from(schema.bookingHolds).where(eq(schema.bookingHolds.tokenHash, sha256(holdToken)));
    if (!hold || hold.consumedAt) return false;
    await tx
      .update(schema.resourceAllocations)
      .set({ releasedAt: now })
      .where(and(eq(schema.resourceAllocations.holdId, hold.id), isNull(schema.resourceAllocations.appointmentId)));
    await tx.update(schema.bookingHolds).set({ expiresAt: now }).where(eq(schema.bookingHolds.id, hold.id));
    return true;
  });
}

/* ---------------------------------------------------------- appointments */

export type ContactInput = {
  name: string;
  email: string;
  phone?: string | null;
  whatsappReminder?: boolean;
  note?: string | null;
  locale: "de" | "en";
};

export const WHATSAPP_CONSENT_VERSION = "whatsapp-reminder-v1";

async function upsertCustomer(tx: Tx, contact: ContactInput, isDemo = false) {
  const email = contact.email.trim().toLowerCase();
  const [existing] = await tx.select().from(schema.customers).where(eq(schema.customers.email, email));
  if (existing) {
    await tx
      .update(schema.customers)
      .set({ name: contact.name.trim(), phone: contact.phone?.trim() || existing.phone, locale: contact.locale })
      .where(eq(schema.customers.id, existing.id));
    return { ...existing, name: contact.name.trim(), phone: contact.phone?.trim() || existing.phone, locale: contact.locale };
  }
  const row = {
    id: newId("cus"),
    email,
    name: contact.name.trim(),
    phone: contact.phone?.trim() || null,
    locale: contact.locale,
    isDemo,
  };
  await tx.insert(schema.customers).values(row);
  const [created] = await tx.select().from(schema.customers).where(eq(schema.customers.id, row.id));
  return created;
}

async function recordWhatsappConsent(tx: Tx, customerId: string, source: string) {
  await tx.insert(schema.consents).values({
    id: newId("con"),
    customerId,
    channel: "whatsapp",
    granted: true,
    source,
    textVersion: WHATSAPP_CONSENT_VERSION,
  });
  await tx.update(schema.customers).set({ whatsappOptIn: true }).where(eq(schema.customers.id, customerId));
}

function snapshotOf(plan: BookingPlan, assignment: Assignment | null, settings: Settings): AppointmentSnapshot {
  return {
    segments: plan.segments.map((seg, i) => {
      const a = assignment?.segments[i];
      return {
        serviceId: seg.serviceId,
        variantId: seg.variantId,
        name: seg.name,
        minutes: seg.minutes,
        priceCents: seg.priceCents,
        bufferBeforeMinutes: seg.bufferBeforeMinutes,
        bufferAfterMinutes: seg.bufferAfterMinutes,
        startsAt: a?.startsAt.toISOString(),
        endsAt: a?.endsAt.toISOString(),
        staffId: a?.staffId,
        roomId: a?.roomId,
        equipmentIds: a?.equipmentIds,
      };
    }),
    offerId: plan.offerId,
    totalCents: plan.totalCents,
    totalMinutes: plan.treatmentMinutes,
    currency: settings.currency,
    policy: { bookingMode: plan.bookingMode, payment: settings.appointmentPayment, pendingTtlHours: settings.pendingTtlHours },
  };
}

function validateContact(contact: ContactInput) {
  if (!contact.name?.trim() || contact.name.trim().length > 120) throw new DomainError("invalid_name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email?.trim() ?? "") || contact.email.length > 200) throw new DomainError("invalid_email");
  if (contact.phone && !/^\+?[0-9 ()/-]{6,24}$/.test(contact.phone.trim())) throw new DomainError("invalid_phone");
  if (contact.whatsappReminder && !contact.phone?.trim()) throw new DomainError("phone_required_for_whatsapp");
  if (contact.note && contact.note.length > 500) throw new DomainError("note_too_long");
}

export async function submitAppointment(db: Db, input: ContactInput & { holdToken: string }, now = new Date()) {
  validateContact(input);
  return db.transaction(async (tx) => {
    await lockBooking(tx);
    const settings = await getSettings(tx);
    const [hold] = await tx.select().from(schema.bookingHolds).where(eq(schema.bookingHolds.tokenHash, sha256(input.holdToken)));
    if (!hold) throw new DomainError("hold_not_found", 404);
    if (hold.consumedAt) throw new DomainError("hold_consumed", 409);
    if (hold.expiresAt <= now) throw new DomainError("hold_expired", 409);

    const payload = hold.plan as HoldPayload;
    const assignment = reviveAssignment(payload.assignment);

    // Re-verify against fresh data: an admin may have blocked a room meanwhile.
    const ctx = await loadContext(tx, addMinutes(assignment.startsAt, -240), addMinutes(assignment.endsAt, 240), { now, excludeHoldId: hold.id });
    const again = tryAssignExact(ctx, payload.plan, assignment);
    if (!again) throw new DomainError("slot_unavailable", 409);

    const customer = await upsertCustomer(tx, input);
    const status = settings.bookingMode === "instant" ? "confirmed" : "pending";
    const pendingExpiresAt = status === "pending"
      ? new Date(Math.min(addMinutes(now, settings.pendingTtlHours * 60).getTime(), assignment.startsAt.getTime()))
      : null;
    const token = newToken();
    const appointmentId = newId("apt");
    await tx.insert(schema.appointments).values({
      id: appointmentId,
      publicTokenHash: sha256(token),
      publicTokenSealed: seal(token),
      customerId: customer.id,
      kind: "slot",
      status,
      snapshot: snapshotOf(payload.plan, assignment, settings),
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      timezone: settings.timezone,
      pendingExpiresAt,
      preferredStaffId: payload.staffPreference,
      customerNote: input.note?.trim() || null,
      whatsappReminder: !!input.whatsappReminder,
      source: "web",
    });
    await tx
      .update(schema.resourceAllocations)
      .set({ appointmentId, blocksUntil: pendingExpiresAt ?? FOREVER })
      .where(and(eq(schema.resourceAllocations.holdId, hold.id), isNull(schema.resourceAllocations.releasedAt)));
    await tx.update(schema.bookingHolds).set({ consumedAt: now }).where(eq(schema.bookingHolds.id, hold.id));
    if (input.whatsappReminder) await recordWhatsappConsent(tx, customer.id, "booking_form");

    const [appointment] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, appointmentId));
    const [freshCustomer] = await tx.select().from(schema.customers).where(eq(schema.customers.id, customer.id));
    await enqueueAppointmentNotifications(tx, appointment, freshCustomer, status === "pending" ? "request_received" : "confirmed", settings, now);
    if (status === "pending") await enqueueAppointmentNotifications(tx, appointment, freshCustomer, "staff_new_request", settings, now);
    return { appointmentId, publicToken: token, status };
  });
}

function reviveAssignment(a: Assignment): Assignment {
  return {
    startsAt: new Date(a.startsAt),
    endsAt: new Date(a.endsAt),
    segments: a.segments.map((s) => ({
      ...s,
      startsAt: new Date(s.startsAt),
      endsAt: new Date(s.endsAt),
      blockStart: new Date(s.blockStart),
      blockEnd: new Date(s.blockEnd),
    })),
  };
}

/** Check that exactly these resources are still free (ignoring the hold's own rows). */
function tryAssignExact(ctx: Context, plan: BookingPlan, assignment: Assignment): boolean {
  for (const seg of assignment.segments) {
    const ids = [staffResourceId(seg.staffId), seg.roomId, ...seg.equipmentIds];
    for (const rid of ids) {
      if (ctx.allocations.some((a) => a.resourceId === rid && overlaps(a.startsAt, a.endsAt, seg.blockStart, seg.blockEnd))) return false;
      if (ctx.timeOff.some((t) => (t.resourceId === rid || t.resourceId === null) && overlaps(t.startsAt, t.endsAt, seg.blockStart, seg.blockEnd))) return false;
    }
  }
  return plan.segments.length === assignment.segments.length;
}

export async function findAppointmentByToken(db: DbOrTx, token: string) {
  if (!token || token.length < 20) return null;
  const [row] = await db.select().from(schema.appointments).where(eq(schema.appointments.publicTokenHash, sha256(token)));
  return row ?? null;
}

/** Guest links stay valid until 30 days after the appointment (or request). */
export function appointmentTokenValid(appointment: typeof schema.appointments.$inferSelect, now = new Date()) {
  const anchor = appointment.endsAt ?? appointment.createdAt;
  return addMinutes(anchor, 30 * 24 * 60) > now;
}

async function loadForUpdate(tx: Tx, id: string) {
  const rows = await tx.execute(sql`SELECT id FROM appointments WHERE id = ${id} FOR UPDATE`);
  const [appointment] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, id));
  if (!appointment || !rows) throw new DomainError("appointment_not_found", 404);
  const [customer] = await tx.select().from(schema.customers).where(eq(schema.customers.id, appointment.customerId));
  return { appointment, customer };
}

async function releaseAppointmentAllocations(tx: Tx, appointmentId: string, now: Date) {
  await tx
    .update(schema.resourceAllocations)
    .set({ releasedAt: now })
    .where(and(eq(schema.resourceAllocations.appointmentId, appointmentId), isNull(schema.resourceAllocations.releasedAt)));
}

export async function approveAppointment(db: Db, id: string, actor: string, now = new Date()) {
  return db.transaction(async (tx) => {
    await lockBooking(tx);
    const settings = await getSettings(tx);
    const { appointment, customer } = await loadForUpdate(tx, id);
    if (appointment.status !== "pending") throw new DomainError("appointment_not_pending", 409);
    if (appointment.pendingExpiresAt && appointment.pendingExpiresAt <= now) {
      await expireOne(tx, appointment, customer, settings, now);
      throw new DomainError("appointment_request_expired", 409);
    }
    // Allocations are still held (blocksUntil = pendingExpiresAt), extend them.
    await tx
      .update(schema.resourceAllocations)
      .set({ blocksUntil: FOREVER })
      .where(and(eq(schema.resourceAllocations.appointmentId, id), isNull(schema.resourceAllocations.releasedAt)));
    await tx
      .update(schema.appointments)
      .set({ status: "confirmed", decidedBy: actor, decidedAt: now, pendingExpiresAt: null, updatedAt: now })
      .where(eq(schema.appointments.id, id));
    const [updated] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, id));
    await enqueueAppointmentNotifications(tx, updated, customer, "confirmed", settings, now);
    await audit(tx, actor, "appointment.approve", "appointment", id);
    return updated;
  });
}

export async function rejectAppointment(db: Db, id: string, actor: string, reason: string | null, now = new Date()) {
  return db.transaction(async (tx) => {
    await lockBooking(tx);
    const settings = await getSettings(tx);
    const { appointment, customer } = await loadForUpdate(tx, id);
    if (!["pending", "requested"].includes(appointment.status)) throw new DomainError("appointment_not_pending", 409);
    await releaseAppointmentAllocations(tx, id, now);
    await tx
      .update(schema.appointments)
      .set({ status: "rejected", decidedBy: actor, decidedAt: now, cancelReason: reason, updatedAt: now })
      .where(eq(schema.appointments.id, id));
    await cancelQueuedJobs(tx, id, now);
    const [updated] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, id));
    await enqueueAppointmentNotifications(tx, updated, customer, "rejected", settings, now);
    await audit(tx, actor, "appointment.reject", "appointment", id, reason ? { reason } : undefined);
    return updated;
  });
}

export async function cancelAppointment(db: Db, id: string, actor: string, reason: string | null, now = new Date()) {
  return db.transaction(async (tx) => {
    await lockBooking(tx);
    const settings = await getSettings(tx);
    const { appointment, customer } = await loadForUpdate(tx, id);
    if (!["pending", "confirmed", "requested"].includes(appointment.status)) throw new DomainError("appointment_not_cancellable", 409);
    if (appointment.startsAt && appointment.startsAt <= now) throw new DomainError("appointment_already_started", 409);
    await releaseAppointmentAllocations(tx, id, now);
    await tx
      .update(schema.appointments)
      .set({ status: "cancelled", cancelledAt: now, cancelReason: reason, decidedBy: actor, updatedAt: now })
      .where(eq(schema.appointments.id, id));
    await cancelQueuedJobs(tx, id, now);
    const [updated] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, id));
    await enqueueAppointmentNotifications(tx, updated, customer, "cancelled", settings, now);
    await audit(tx, actor, "appointment.cancel", "appointment", id, reason ? { reason } : undefined);
    return updated;
  });
}

async function expireOne(tx: Tx, appointment: typeof schema.appointments.$inferSelect, customer: typeof schema.customers.$inferSelect, settings: Settings, now: Date) {
  await releaseAppointmentAllocations(tx, appointment.id, now);
  await tx.update(schema.appointments).set({ status: "expired", updatedAt: now }).where(eq(schema.appointments.id, appointment.id));
  await cancelQueuedJobs(tx, appointment.id, now);
  const [updated] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, appointment.id));
  await enqueueAppointmentNotifications(tx, updated, customer, "expired", settings, now);
}

/** Sweep: pending requests nobody decided in time lose their slot, and the guest is told. */
export async function expirePendingAppointments(db: Db, now = new Date()) {
  const due = await db
    .select({ id: schema.appointments.id })
    .from(schema.appointments)
    .where(and(eq(schema.appointments.status, "pending"), lt(schema.appointments.pendingExpiresAt, now)));
  let count = 0;
  for (const { id } of due) {
    await db.transaction(async (tx) => {
      await lockBooking(tx);
      const settings = await getSettings(tx);
      const { appointment, customer } = await loadForUpdate(tx, id);
      if (appointment.status !== "pending" || !appointment.pendingExpiresAt || appointment.pendingExpiresAt > now) return;
      await expireOne(tx, appointment, customer, settings, now);
      count++;
    });
  }
  return count;
}

/**
 * Reschedule: reserve the new slot first, then release the old one — in the
 * same transaction, so a failure leaves the original booking untouched.
 * A guest who moves a confirmed booking goes back to "pending" for review.
 */
export async function rescheduleAppointment(
  db: Db,
  id: string,
  input: { date: string; time: string; staffId?: string | null },
  actor: { kind: "staff" | "customer"; id: string },
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    await lockBooking(tx);
    const settings = await getSettings(tx);
    const { appointment, customer } = await loadForUpdate(tx, id);
    if (!["pending", "confirmed"].includes(appointment.status)) throw new DomainError("appointment_not_reschedulable", 409);
    if (appointment.kind !== "slot" && !appointment.startsAt) throw new DomainError("appointment_not_reschedulable", 409);
    const start = parseStart(settings, input.date, input.time, now);
    if (actor.kind === "customer" && start < addMinutes(now, settings.minLeadMinutes)) throw new DomainError("slot_unavailable", 409);

    const plan = planFromSnapshot(appointment.snapshot, settings);
    await refreshResourceNeeds(tx, plan);
    const { from, to } = dayBounds(input.date, settings.timezone);
    const ctx = await loadContext(tx, from, to, { now, excludeAppointmentId: id });
    const assignment = tryAssign(ctx, plan, start, input.staffId);
    if (!assignment) throw new DomainError("slot_unavailable", 409);

    const status = actor.kind === "customer" && settings.bookingMode !== "instant" ? "pending" : appointment.status;
    const pendingExpiresAt = status === "pending"
      ? new Date(Math.min(addMinutes(now, settings.pendingTtlHours * 60).getTime(), assignment.startsAt.getTime()))
      : null;

    await releaseAppointmentAllocations(tx, id, now);
    await insertAllocations(tx, assignment, { appointmentId: id }, pendingExpiresAt ?? FOREVER);
    await tx
      .update(schema.appointments)
      .set({
        status,
        startsAt: assignment.startsAt,
        endsAt: assignment.endsAt,
        pendingExpiresAt,
        snapshot: { ...snapshotOf(plan, assignment, settings), totalCents: appointment.snapshot.totalCents, policy: appointment.snapshot.policy },
        updatedAt: now,
      })
      .where(eq(schema.appointments.id, id));
    await cancelQueuedJobs(tx, id, now);
    const [updated] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, id));
    await enqueueAppointmentNotifications(tx, updated, customer, "rescheduled", settings, now);
    if (status === "pending" && actor.kind === "customer") await enqueueAppointmentNotifications(tx, updated, customer, "staff_new_request", settings, now);
    await audit(tx, `${actor.kind}:${actor.id}`, "appointment.reschedule", "appointment", id, { to: assignment.startsAt.toISOString() });
    return updated;
  });
}

/** Snapshots keep prices; skills, rooms and equipment are read fresh (staff may have changed). */
async function refreshResourceNeeds(db: DbOrTx, plan: BookingPlan) {
  for (const seg of plan.segments) {
    const fresh = await segmentFor(db, seg.serviceId, seg.variantId);
    Object.assign(seg, { staffIds: fresh.staffIds, roomTypes: fresh.roomTypes, equipmentTypes: fresh.equipmentTypes });
  }
}

function planFromSnapshot(snapshot: AppointmentSnapshot, settings: Settings): BookingPlan {
  return {
    segments: snapshot.segments.map((s) => ({
      serviceId: s.serviceId,
      variantId: s.variantId,
      name: s.name,
      minutes: s.minutes,
      priceCents: s.priceCents,
      bufferBeforeMinutes: s.bufferBeforeMinutes,
      bufferAfterMinutes: s.bufferAfterMinutes,
      roomTypes: [],
      equipmentTypes: [],
      staffIds: [],
    })),
    gapMinutes: snapshot.segments.length > 1 ? settings.comboBufferMinutes : 0,
    totalCents: snapshot.totalCents,
    treatmentMinutes: snapshot.totalMinutes,
    offerId: snapshot.offerId,
    bookingMode: snapshot.policy.bookingMode,
  };
}

/* ------------------------------------------ requests & staff-created bookings */

/** Combo "Pflege & Ruhe": customers send a request; staff schedule the chain. No fake free slots. */
export async function createComboRequest(
  db: Db,
  input: ContactInput & { offerId: string; preferredDates: string; preferredTime: "morning" | "afternoon" | "evening" | "any" },
  now = new Date(),
) {
  validateContact(input);
  if (!input.preferredDates?.trim() || input.preferredDates.length > 300) throw new DomainError("invalid_preferences");
  return db.transaction(async (tx) => {
    const settings = await getSettings(tx);
    const plan = await buildPlan(tx, { offerId: input.offerId }, now);
    const customer = await upsertCustomer(tx, input);
    const token = newToken();
    const id = newId("apt");
    await tx.insert(schema.appointments).values({
      id,
      publicTokenHash: sha256(token),
      publicTokenSealed: seal(token),
      customerId: customer.id,
      kind: "combo_request",
      status: "requested",
      snapshot: snapshotOf(plan, null, settings),
      timezone: settings.timezone,
      customerNote: input.note?.trim() || null,
      requestPreferences: { preferredDates: input.preferredDates.trim(), preferredTime: input.preferredTime },
      whatsappReminder: !!input.whatsappReminder,
      source: "web",
    });
    if (input.whatsappReminder) await recordWhatsappConsent(tx, customer.id, "combo_request_form");
    const [appointment] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, id));
    const [fresh] = await tx.select().from(schema.customers).where(eq(schema.customers.id, customer.id));
    await enqueueAppointmentNotifications(tx, appointment, fresh, "request_received", settings, now);
    await enqueueAppointmentNotifications(tx, appointment, fresh, "staff_new_request", settings, now);
    return { appointmentId: id, publicToken: token, status: "requested" as const };
  });
}

/** Staff place a combo request on a concrete chain of slots → confirmed. */
export async function scheduleRequest(db: Db, id: string, input: { date: string; time: string; staffId?: string | null }, actor: string, now = new Date()) {
  return db.transaction(async (tx) => {
    await lockBooking(tx);
    const settings = await getSettings(tx);
    const { appointment, customer } = await loadForUpdate(tx, id);
    if (appointment.status !== "requested") throw new DomainError("appointment_not_pending", 409);
    const plan = planFromSnapshot(appointment.snapshot, settings);
    await refreshResourceNeeds(tx, plan);
    const start = parseStart(settings, input.date, input.time, now);
    const { from, to } = dayBounds(input.date, settings.timezone);
    const ctx = await loadContext(tx, from, to, { now });
    const assignment = tryAssign(ctx, plan, start, input.staffId);
    if (!assignment) throw new DomainError("slot_unavailable", 409);
    await insertAllocations(tx, assignment, { appointmentId: id }, FOREVER);
    await tx
      .update(schema.appointments)
      .set({
        status: "confirmed",
        startsAt: assignment.startsAt,
        endsAt: assignment.endsAt,
        snapshot: { ...snapshotOf(plan, assignment, settings), totalCents: appointment.snapshot.totalCents, policy: appointment.snapshot.policy },
        decidedBy: actor,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.appointments.id, id));
    const [updated] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, id));
    await enqueueAppointmentNotifications(tx, updated, customer, "confirmed", settings, now);
    await audit(tx, actor, "appointment.schedule_request", "appointment", id);
    return updated;
  });
}

/** Admin tool for combo requests: candidate chain starts for a day. */
export async function requestCandidates(db: DbOrTx, id: string, date: string, now = new Date()) {
  const settings = await getSettings(db);
  const [appointment] = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id));
  if (!appointment) throw new DomainError("appointment_not_found", 404);
  const plan = planFromSnapshot(appointment.snapshot, settings);
  await refreshResourceNeeds(db, plan);
  const { from, to } = dayBounds(date, settings.timezone);
  const ctx = await loadContext(db, from, to, { now });
  return slotsForDay({ ...ctx, settings: { ...ctx.settings, minLeadMinutes: 0 } }, plan, date, null);
}

export async function createStaffAppointment(
  db: Db,
  input: ContactInput & PlanInput & { date: string; time: string; staffId?: string | null },
  actor: string,
  now = new Date(),
) {
  validateContact(input);
  return db.transaction(async (tx) => {
    await lockBooking(tx);
    const settings = await getSettings(tx);
    const plan = await buildPlan(tx, input, now);
    const start = parseStart(settings, input.date, input.time, now);
    const { from, to } = dayBounds(input.date, settings.timezone);
    const ctx = await loadContext(tx, from, to, { now });
    const assignment = tryAssign(ctx, plan, start, input.staffId);
    if (!assignment) throw new DomainError("slot_unavailable", 409);
    const customer = await upsertCustomer(tx, input);
    const id = newId("apt");
    await tx.insert(schema.appointments).values({
      id,
      publicTokenHash: sha256(newToken()),
      customerId: customer.id,
      kind: "slot",
      status: "confirmed",
      snapshot: snapshotOf(plan, assignment, settings),
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      timezone: settings.timezone,
      preferredStaffId: input.staffId ?? null,
      customerNote: input.note?.trim() || null,
      source: "admin",
      decidedBy: actor,
      decidedAt: now,
    });
    await insertAllocations(tx, assignment, { appointmentId: id }, FOREVER);
    const [appointment] = await tx.select().from(schema.appointments).where(eq(schema.appointments.id, id));
    await enqueueAppointmentNotifications(tx, appointment, customer, "confirmed", settings, now);
    await audit(tx, actor, "appointment.create_manual", "appointment", id);
    return appointment;
  });
}

/* ------------------------------------------------------------- read models */

export async function appointmentsBetween(db: DbOrTx, from: Date, to: Date) {
  const rows = await db
    .select({ appointment: schema.appointments, customer: schema.customers })
    .from(schema.appointments)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.appointments.customerId))
    .where(and(lt(schema.appointments.startsAt, to), gt(schema.appointments.endsAt, from), inArray(schema.appointments.status, ["pending", "confirmed"])));
  return rows;
}

export { dayBounds };
