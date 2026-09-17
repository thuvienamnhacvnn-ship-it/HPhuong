import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { schema } from "../src/lib/db";
import {
  applyPaymentEvent,
  createVoucherOrder,
  handlePaymentWebhook,
  redeemVoucher,
  refundVoucherOrder,
  signPayload,
} from "../src/lib/payments";
import { processDueJobs } from "../src/lib/notifications/worker";
import { approveAppointment, createHold, submitAppointment } from "../src/lib/scheduling";
import { DomainError } from "../src/lib/errors";
import { NOW, TUESDAY, contact, testDb } from "./helpers";

type TestDb = Awaited<ReturnType<typeof testDb>>;

async function paidVoucher(db: TestDb, amountCents = 10000) {
  const order = await createVoucherOrder(db, {
    amountCents,
    buyerName: "Käuferin",
    buyerEmail: "kauf@example.invalid",
    paymentMethod: "card",
    idempotencyKey: `idem-${Math.random().toString(36).slice(2)}-xxxxxxxx`,
    locale: "de",
  });
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.orderId, order.orderId));
  const event = { id: "evt_1", type: "payment.succeeded" as const, sessionId: payment.providerSessionId, amountCents, currency: "EUR" };
  await applyPaymentEvent(db, "sandbox", event);
  await processDueJobs(db);
  const [mail] = await db.select().from(schema.outbox);
  const code = mail.body.match(/HP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)![0];
  return { order, payment, event, code };
}

test("voucher is issued exactly once even when the webhook repeats", async () => {
  const db = await testDb();
  const { order, payment, event } = await paidVoucher(db);
  // same event id again, and a *different* event id for the same payment
  assert.deepEqual(await applyPaymentEvent(db, "sandbox", event), { duplicate: true });
  await applyPaymentEvent(db, "sandbox", { ...event, id: "evt_2" });
  await processDueJobs(db);
  await processDueJobs(db);
  const vouchers = await db.select().from(schema.vouchers).where(eq(schema.vouchers.orderId, order.orderId));
  assert.equal(vouchers.length, 1);
  assert.equal(vouchers[0].balanceCents, 10000);
  const jobs = await db.select().from(schema.notificationJobs).where(eq(schema.notificationJobs.template, "voucher_issued"));
  assert.equal(jobs.length, 1, "one issue e-mail job");
  assert.equal((await db.select().from(schema.outbox)).length, 1, "retrying the worker does not send a second voucher e-mail");
  assert.equal((jobs[0].payload as Record<string, unknown>).sealedCode, undefined, "code removed from the job after sending");
  const [p] = await db.select().from(schema.payments).where(eq(schema.payments.id, payment.id));
  assert.equal(p.status, "paid");
});

test("webhooks without a valid signature are rejected; a redirect alone never marks paid", async () => {
  const db = await testDb();
  const order = await createVoucherOrder(db, { amountCents: 5000, buyerName: "K", buyerEmail: "k@example.invalid", paymentMethod: "paypal", idempotencyKey: "idem-signature-test-0001", locale: "en" });
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.orderId, order.orderId));
  const raw = JSON.stringify({ id: "evt_x", type: "payment.succeeded", sessionId: payment.providerSessionId, amountCents: 5000, currency: "EUR" });
  await assert.rejects(handlePaymentWebhook(db, "sandbox", raw, "00"), (e: DomainError) => e.code === "invalid_signature");
  await assert.rejects(handlePaymentWebhook(db, "sandbox", raw.replace("5000", "1"), signPayload("sandbox", raw)), (e: DomainError) => e.code === "invalid_signature");
  const [o] = await db.select().from(schema.voucherOrders).where(eq(schema.voucherOrders.id, order.orderId));
  assert.equal(o.status, "pending");
  const ok = await handlePaymentWebhook(db, "sandbox", raw, signPayload("sandbox", raw));
  assert.equal((ok as { paid?: boolean }).paid, true);
});

test("amounts are quoted by the server and orders are idempotent", async () => {
  const db = await testDb();
  await assert.rejects(
    createVoucherOrder(db, { amountCents: 1, buyerName: "K", buyerEmail: "k@example.invalid", paymentMethod: "card", idempotencyKey: "idem-amount-test-00001", locale: "de" }),
    (e: DomainError) => e.code === "invalid_amount",
  );
  const input = { amountCents: 15000, buyerName: "K", buyerEmail: "k@example.invalid", paymentMethod: "card" as const, idempotencyKey: "idem-double-click-00001", locale: "de" as const };
  const a = await createVoucherOrder(db, input);
  const b = await createVoucherOrder(db, input);
  assert.equal(a.orderId, b.orderId);
  assert.equal((await db.select().from(schema.voucherOrders)).length, 1);
});

test("redeem 70 € of 100 € leaves 30 €; concurrent redemptions never go negative", async () => {
  const db = await testDb();
  const { code } = await paidVoucher(db);
  const first = await redeemVoucher(db, { code, amountCents: 7000, actor: "usr-manager" });
  assert.equal(first.balanceCents, 3000);
  const results = await Promise.allSettled([
    redeemVoucher(db, { code, amountCents: 2000, actor: "usr-manager" }),
    redeemVoucher(db, { code: code.toLowerCase().replace(/-/g, " "), amountCents: 2000, actor: "usr-therapist" }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert.equal((rejected.reason as DomainError).code, "insufficient_balance");
  const [voucher] = await db.select().from(schema.vouchers);
  assert.equal(voucher.balanceCents, 1000);
  const ledger = await db.select().from(schema.voucherLedger).where(eq(schema.voucherLedger.voucherId, voucher.id));
  assert.equal(ledger.reduce((sum, l) => sum + l.amountCents, 0), 1000, "ledger sums to the balance");
});

test("refunding a partly used voucher needs an explicit decision and keeps the ledger", async () => {
  const db = await testDb();
  const { code, order } = await paidVoucher(db);
  await redeemVoucher(db, { code, amountCents: 4000, actor: "usr-manager" });
  await assert.rejects(refundVoucherOrder(db, order.orderId, "usr-owner"), (e: DomainError) => e.code === "voucher_partially_redeemed");
  const r = await refundVoucherOrder(db, order.orderId, "usr-owner", { allowPartial: true, note: "Kulanz" });
  assert.equal(r.refundCents, 6000);
  const ledger = await db.select().from(schema.voucherLedger);
  assert.deepEqual(ledger.map((l) => l.type).sort(), ["issue", "redeem", "refund"]);
});

test("no WhatsApp without opt-in or phone; configured-off WhatsApp falls back to e-mail without duplicates", async () => {
  const db = await testDb();
  // opt-in without phone is refused by validation
  const h0 = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
  await assert.rejects(
    submitAppointment(db, { ...contact({ whatsappReminder: true, phone: null }), holdToken: h0.holdToken }, NOW),
    (e: DomainError) => e.code === "phone_required_for_whatsapp",
  );

  // no opt-in → no WhatsApp jobs at all
  const r1 = await submitAppointment(db, { ...contact({ phone: "+49 170 0000000" }), holdToken: h0.holdToken }, NOW);
  await approveAppointment(db, r1.appointmentId, "usr-manager", NOW);
  const wa1 = await db.select().from(schema.notificationJobs).where(eq(schema.notificationJobs.channel, "whatsapp"));
  assert.equal(wa1.length, 0);

  // opt-in + phone → WhatsApp job queued with consent recorded
  const h2 = await createHold(db, { serviceId: "aroma-massage", variantId: "60", date: TUESDAY, time: "12:00" }, NOW);
  const r2 = await submitAppointment(db, { ...contact({ email: "wa@example.invalid", phone: "+49 170 1111111", whatsappReminder: true }), holdToken: h2.holdToken }, NOW);
  await approveAppointment(db, r2.appointmentId, "usr-manager", NOW);
  const consents = await db.select().from(schema.consents);
  assert.equal(consents.length, 1);
  assert.equal(consents[0].textVersion, "whatsapp-reminder-v1");
  await processDueJobs(db, NOW);
  const wa2 = await db.select().from(schema.notificationJobs).where(eq(schema.notificationJobs.channel, "whatsapp"));
  const confirmedWa = wa2.find((j) => j.template === "appointment_confirmed")!;
  assert.equal(confirmedWa.status, "skipped");
  assert.equal(confirmedWa.lastError, "whatsapp_not_configured");
  const confirmedMails = (await db.select().from(schema.notificationJobs)).filter((j) => j.appointmentId === r2.appointmentId && j.template === "appointment_confirmed" && j.channel === "email");
  assert.equal(confirmedMails.length, 1, "fallback does not duplicate the e-mail");
  assert.ok(!(await db.select().from(schema.notificationJobs)).some((j) => j.status === "sent"), "nothing is claimed as delivered without a provider");
});
