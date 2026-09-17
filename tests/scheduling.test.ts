import { test } from "node:test";
import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { schema } from "../src/lib/db";
import { quote } from "../src/lib/catalog";
import {
  approveAppointment,
  cancelAppointment,
  createComboRequest,
  createHold,
  expirePendingAppointments,
  findAppointmentByToken,
  getAvailability,
  rescheduleAppointment,
  scheduleRequest,
  submitAppointment,
} from "../src/lib/scheduling";
import { addMinutes, zonedToUtc } from "../src/lib/time";
import { DomainError } from "../src/lib/errors";
import { NOW, TUESDAY, blockResource, contact, testDb } from "./helpers";

const times = (days: { slots: { time: string }[] }[]) => days[0].slots.map((s) => s.time);

test("prices come from the catalog: facial 60 = 6900 cents, 90 = 9900 cents", async () => {
  const db = await testDb();
  assert.equal((await quote(db, { serviceId: "gesichtspflege", variantId: "60" })).totalCents, 6900);
  assert.equal((await quote(db, { serviceId: "gesichtspflege", variantId: "90" })).totalCents, 9900);
  const combo = await quote(db, { offerId: "pflege-ruhe" });
  assert.equal(combo.totalCents, 12900);
  assert.equal(combo.treatmentMinutes, 120);
});

test("changing the variant changes the available slots", async () => {
  const db = await testDb();
  // Room 1 is the only cosmetic room; block it 10:45–12:00.
  await blockResource(db, "room-1", TUESDAY, "10:45", "12:00");
  const v60 = times((await getAvailability(db, { serviceId: "gesichtspflege", variantId: "60", from: TUESDAY }, NOW)).days);
  const v90 = times((await getAvailability(db, { serviceId: "gesichtspflege", variantId: "90", from: TUESDAY }, NOW)).days);
  assert.ok(v60.includes("09:30"), "60 min + 15 buffer ends 10:45 — fits");
  assert.ok(!v90.includes("09:30"), "90 min would run into the block");
  assert.notDeepEqual(v60, v90);
});

test("a 120-minute combo never fits into a 60-minute gap", async () => {
  const db = await testDb();
  await blockResource(db, "room-1", TUESDAY, "11:15", "18:00");
  await blockResource(db, "room-2", TUESDAY, "11:15", "18:00");
  await blockResource(db, "room-1", TUESDAY, "09:00", "10:00");
  await blockResource(db, "room-2", TUESDAY, "09:00", "10:00");
  const single = times((await getAvailability(db, { serviceId: "gesichtspflege", variantId: "60", from: TUESDAY }, NOW)).days);
  assert.deepEqual(single, ["10:00"]);
  const combo = await getAvailability(db, { offerId: "pflege-ruhe", from: TUESDAY }, NOW);
  assert.deepEqual(times(combo.days), []);
});

test("combo chain gets consecutive resources incl. buffer when staff schedule the request", async () => {
  const db = await testDb();
  const req = await createComboRequest(db, { ...contact(), offerId: "pflege-ruhe", preferredDates: "Dienstag vormittag", preferredTime: "morning" }, NOW);
  assert.equal(req.status, "requested");
  const allocsBefore = await db.select().from(schema.resourceAllocations);
  assert.equal(allocsBefore.length, 0, "a request does not pretend to hold a slot");
  const scheduled = await scheduleRequest(db, req.appointmentId, { date: TUESDAY, time: "10:00" }, "usr-manager", NOW);
  assert.equal(scheduled.status, "confirmed");
  const seg = scheduled.snapshot.segments;
  assert.equal(seg.length, 2);
  // facial 10:00–11:00, buffer max(15, combo gap 10) → massage 11:15–12:15
  assert.equal(new Date(seg[1].startsAt!).getTime(), zonedToUtc(TUESDAY, "11:15", "Europe/Berlin")!.getTime());
  assert.equal(seg[1].roomId, "room-2");
});

test("two simultaneous requests for the same staff/room: only one holds it", async () => {
  const db = await testDb();
  const attempt = () => createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
  const results = await Promise.allSettled([attempt(), attempt(), attempt()]);
  const ok = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  assert.equal(ok.length, 1, "only one cosmetic room exists");
  assert.ok(failed.every((f) => f.reason instanceof DomainError && f.reason.code === "slot_unavailable"));
});

test("buffers count: the next booking cannot start inside the previous buffer", async () => {
  const db = await testDb();
  await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
  await assert.rejects(
    createHold(db, { serviceId: "head-spa", variantId: "45", date: TUESDAY, time: "11:00" }, NOW),
    (e: DomainError) => e.code === "slot_unavailable",
  );
  await createHold(db, { serviceId: "head-spa", variantId: "45", date: TUESDAY, time: "11:15" }, NOW);
});

test("a submitted booking is pending, never shown as confirmed until staff approve", async () => {
  const db = await testDb();
  const hold = await createHold(db, { serviceId: "gesichtspflege", variantId: "90", date: TUESDAY, time: "14:00" }, NOW);
  const res = await submitAppointment(db, { ...contact(), holdToken: hold.holdToken }, addMinutes(NOW, 2));
  assert.equal(res.status, "pending");
  const found = await findAppointmentByToken(db, res.publicToken);
  assert.equal(found?.status, "pending");
  assert.equal(found?.snapshot.totalCents, 9900);
  const approved = await approveAppointment(db, res.appointmentId, "usr-manager", addMinutes(NOW, 30));
  assert.equal(approved.status, "confirmed");
});

test("an expired hold cannot be submitted and the slot is free again", async () => {
  const db = await testDb();
  const hold = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
  const later = addMinutes(NOW, 11);
  await assert.rejects(submitAppointment(db, { ...contact(), holdToken: hold.holdToken }, later), (e: DomainError) => e.code === "hold_expired");
  await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, later);
});

test("pending requests that nobody decides expire and release the slot", async () => {
  const db = await testDb();
  const hold = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "16:00" }, NOW);
  const res = await submitAppointment(db, { ...contact(), holdToken: hold.holdToken }, NOW);
  const after = addMinutes(NOW, 25 * 60);
  assert.equal(await expirePendingAppointments(db, after), 1);
  const found = await findAppointmentByToken(db, res.publicToken);
  assert.equal(found?.status, "expired");
  await assert.rejects(approveAppointment(db, res.appointmentId, "usr-manager", after), (e: DomainError) => e.code === "appointment_not_pending");
});

test("rescheduling reserves the new slot and releases the old one", async () => {
  const db = await testDb();
  const hold = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
  const res = await submitAppointment(db, { ...contact(), holdToken: hold.holdToken }, NOW);
  await approveAppointment(db, res.appointmentId, "usr-manager", NOW);
  await rescheduleAppointment(db, res.appointmentId, { date: TUESDAY, time: "13:00" }, { kind: "staff", id: "usr-manager" }, NOW);
  // old slot is bookable again
  await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
  const active = await db
    .select()
    .from(schema.resourceAllocations)
    .where(and(eq(schema.resourceAllocations.appointmentId, res.appointmentId)));
  assert.ok(active.some((a) => a.releasedAt) && active.some((a) => !a.releasedAt));
});

test("cancelling an appointment cancels its reminder job", async () => {
  const db = await testDb();
  const hold = await createHold(db, { serviceId: "aroma-massage", variantId: "60", date: TUESDAY, time: "15:00" }, NOW);
  const res = await submitAppointment(db, { ...contact(), holdToken: hold.holdToken }, NOW);
  await approveAppointment(db, res.appointmentId, "usr-manager", NOW);
  const reminders = () =>
    db.select().from(schema.notificationJobs).where(and(eq(schema.notificationJobs.appointmentId, res.appointmentId), eq(schema.notificationJobs.template, "appointment_reminder")));
  assert.equal((await reminders())[0].status, "queued");
  await cancelAppointment(db, res.appointmentId, "customer", null, NOW);
  assert.ok((await reminders()).every((j) => j.status === "cancelled"));
});

test("the past and today's lead time are not bookable", async () => {
  const db = await testDb();
  await assert.rejects(
    createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: "2026-10-16", time: "10:00" }, NOW),
    (e: DomainError) => e.code === "slot_in_past",
  );
  const today = await getAvailability(db, { serviceId: "gesichtspflege", variantId: "60", from: "2026-10-19" }, NOW);
  assert.ok(today.days[0].slots.every((s) => s.time >= "10:00"));
});
