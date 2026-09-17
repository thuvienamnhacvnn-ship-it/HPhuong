import "server-only";
import { and, asc, desc, eq, gt, inArray, lt } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";
import { getSettings } from "./catalog";
import { dayBounds, staffResourceId, todayLocal } from "./scheduling";
import { isValidDateString, toLocalParts } from "./time";

export type Block = {
  appointmentId: string;
  status: string;
  kind: string;
  customerName: string;
  serviceName: string;
  start: string; // HH:MM local
  end: string;
  startMin: number;
  endMin: number;
  note: string | null;
};

export async function dayView(db: Db, dateParam: string | undefined, by: "room" | "staff") {
  const settings = await getSettings(db);
  const tz = settings.timezone;
  const date = dateParam && isValidDateString(dateParam) ? dateParam : todayLocal(tz);
  const { from, to } = dayBounds(date, tz);

  const resources = await db.select().from(schema.resources).where(eq(schema.resources.active, true)).orderBy(asc(schema.resources.id));
  const columns = resources.filter((r) => r.kind === by);

  const rows = await db
    .select({ appointment: schema.appointments, customer: schema.customers })
    .from(schema.appointments)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.appointments.customerId))
    .where(and(lt(schema.appointments.startsAt, to), gt(schema.appointments.endsAt, from), inArray(schema.appointments.status, ["pending", "confirmed"])));

  const blocks = new Map<string, Block[]>(columns.map((c) => [c.id, []]));
  for (const { appointment, customer } of rows) {
    for (const seg of appointment.snapshot.segments) {
      if (!seg.startsAt || !seg.endsAt) continue;
      const colId = by === "room" ? seg.roomId : seg.staffId ? staffResourceId(seg.staffId) : undefined;
      if (!colId || !blocks.has(colId)) continue;
      const s = toLocalParts(new Date(seg.startsAt), tz);
      const e = toLocalParts(new Date(seg.endsAt), tz);
      blocks.get(colId)!.push({
        appointmentId: appointment.id,
        status: appointment.status,
        kind: appointment.kind,
        customerName: customer.name,
        serviceName: seg.name.de,
        start: s.time,
        end: e.time,
        startMin: s.minutes,
        endMin: e.minutes,
        note: appointment.customerNote,
      });
    }
  }

  const offs = await db.select().from(schema.timeOff).where(and(lt(schema.timeOff.startsAt, to), gt(schema.timeOff.endsAt, from)));
  const offBlocks = offs.map((o) => {
    const s = o.startsAt < from ? { minutes: 0, time: "00:00" } : toLocalParts(o.startsAt, tz);
    const e = o.endsAt > to ? { minutes: 24 * 60, time: "24:00" } : toLocalParts(o.endsAt, tz);
    return { id: o.id, resourceId: o.resourceId, reason: o.reason, startMin: s.minutes, endMin: e.minutes, start: s.time, end: e.time };
  });

  const pending = await pendingRequests(db, 3);
  const confirmedToday = rows.filter((r) => r.appointment.status === "confirmed").length;
  const pendingToday = rows.filter((r) => r.appointment.status === "pending").length;
  const roomsFree = resources.filter((r) => r.kind === "room").filter((room) => !rows.some((r) => r.appointment.snapshot.segments.some((s) => s.roomId === room.id))).length;

  return { settings, date, columns, blocks, offBlocks, pending, kpis: { pendingToday, confirmedToday, openRequests: pending.total, roomsFree } };
}

export async function pendingRequests(db: Db, limit = 50) {
  const rows = await db
    .select({ appointment: schema.appointments, customer: schema.customers })
    .from(schema.appointments)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.appointments.customerId))
    .where(inArray(schema.appointments.status, ["pending", "requested"]))
    .orderBy(asc(schema.appointments.pendingExpiresAt), asc(schema.appointments.createdAt));
  return { total: rows.length, items: rows.slice(0, limit) };
}

export async function recentJobs(db: Db) {
  return db.select().from(schema.notificationJobs).orderBy(desc(schema.notificationJobs.createdAt)).limit(100);
}
