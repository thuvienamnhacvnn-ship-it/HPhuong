/**
 * Voucher orders, payments and the voucher ledger.
 *
 * Invariants:
 *  - A booking is never a payment; voucher orders never touch appointments.
 *  - The server quotes the amount from settings; client amounts are only a choice.
 *  - A redirect back from checkout proves nothing. Only a verified webhook
 *    event marks a payment paid, and only then is a voucher issued.
 *  - Webhook events are idempotent by (provider, eventId); a voucher is unique
 *    per order; the issue e-mail is unique per order. Repeats change nothing.
 *  - Balances move only through ledger entries inside a row-locked
 *    transaction; a CHECK constraint forbids negative balances.
 *  - Voucher codes are stored as hashes. The plain code exists only inside the
 *    encrypted e-mail job payload until that e-mail is sent.
 */
import { createHmac } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Db, DbOrTx, Tx } from "./db";
import { schema } from "./db";
import { DomainError } from "./errors";
import { getSettings } from "./catalog";
import { newId, newToken, newVoucherCode, normalizeVoucherCode, safeEqualHex, seal, sha256, unseal, webhookSecret } from "./ids";
import { enqueue } from "./notifications/queue";
import { audit } from "./audit";

export type PaymentMethod = "card" | "paypal";

export type VoucherOrderInput = {
  amountCents: number;
  buyerName: string;
  buyerEmail: string;
  recipientName?: string | null;
  message?: string | null;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  locale: "de" | "en";
};

/* --------------------------------------------------------------- providers */

export type CheckoutSession = { sessionId: string; redirectUrl: string };

export interface PaymentProvider {
  id: string;
  isTest: boolean;
  createCheckout(args: { paymentId: string; amountCents: number; currency: string; method: PaymentMethod; locale: string }): Promise<CheckoutSession>;
}

/**
 * Sandbox provider: a hosted test checkout page inside this app, clearly
 * labelled "Testzahlung". Its "pay" button emits a signed webhook exactly like
 * a real provider would, through the same verification code path.
 *
 * Real providers (Stripe Checkout, PayPal Orders) plug in behind this
 * interface once the owner has approved prices, taxes and legal texts and the
 * keys are configured — see docs/INTEGRATIONS.md. Until then paymentMode
 * stays "sandbox" and nothing can charge real money.
 */
export const sandboxProvider: PaymentProvider = {
  id: "sandbox",
  isTest: true,
  async createCheckout({ paymentId, locale }) {
    const sessionId = `cs_test_${newToken().slice(0, 32)}`;
    void paymentId;
    return { sessionId, redirectUrl: `/${locale}/checkout/testzahlung/${sessionId}` };
  },
};

export function providerFor(mode: string): PaymentProvider {
  if (mode === "sandbox") return sandboxProvider;
  throw new DomainError("payment_provider_not_configured", 503);
}

export function signPayload(provider: string, rawBody: string) {
  return createHmac("sha256", webhookSecret(provider)).update(rawBody).digest("hex");
}

export function verifySignature(provider: string, rawBody: string, signature: string | null) {
  if (!signature) return false;
  return safeEqualHex(signPayload(provider, rawBody), signature);
}

/* ------------------------------------------------------------------ orders */

function validateOrder(input: VoucherOrderInput, allowed: number[], maxMessage: number) {
  if (!allowed.includes(input.amountCents)) throw new DomainError("invalid_amount");
  if (!input.buyerName?.trim() || input.buyerName.length > 120) throw new DomainError("invalid_name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.buyerEmail?.trim() ?? "")) throw new DomainError("invalid_email");
  if (input.recipientName && input.recipientName.length > 120) throw new DomainError("invalid_recipient");
  if (input.message && input.message.length > maxMessage) throw new DomainError("message_too_long");
  if (!["card", "paypal"].includes(input.paymentMethod)) throw new DomainError("invalid_payment_method");
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(input.idempotencyKey ?? "")) throw new DomainError("invalid_idempotency_key");
}

export async function createVoucherOrder(db: Db, input: VoucherOrderInput) {
  const settings = await getSettings(db);
  validateOrder(input, settings.voucherDenominationsCents, settings.voucherMessageMaxLength);
  const provider = providerFor(settings.paymentMode);

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(schema.voucherOrders).where(eq(schema.voucherOrders.idempotencyKey, input.idempotencyKey));
    if (existing) {
      // Same key = same submit (double click, retry). Return the same checkout, never a second order.
      if (existing.amountCents !== input.amountCents || existing.buyerEmail !== input.buyerEmail.trim().toLowerCase()) {
        throw new DomainError("idempotency_key_reused", 409);
      }
      const [payment] = await tx.select().from(schema.payments).where(eq(schema.payments.orderId, existing.id)).orderBy(desc(schema.payments.createdAt));
      return { orderId: existing.id, orderToken: existing.publicTokenSealed ? unseal(existing.publicTokenSealed) : null, redirectUrl: `/${existing.locale}/checkout/testzahlung/${payment.providerSessionId}`, reused: true };
    }

    const orderId = newId("ord");
    const token = newToken();
    await tx.insert(schema.voucherOrders).values({
      id: orderId,
      publicTokenHash: sha256(token),
      publicTokenSealed: seal(token),
      idempotencyKey: input.idempotencyKey,
      buyerName: input.buyerName.trim(),
      buyerEmail: input.buyerEmail.trim().toLowerCase(),
      recipientName: input.recipientName?.trim() || null,
      message: input.message?.trim() || null,
      amountCents: input.amountCents, // quoted from settings above, not from the client's word
      currency: settings.currency,
      locale: input.locale,
      status: "pending",
      paymentMethod: input.paymentMethod,
      isTest: provider.isTest,
    });
    const paymentId = newId("pay");
    const session = await provider.createCheckout({ paymentId, amountCents: input.amountCents, currency: settings.currency, method: input.paymentMethod, locale: input.locale });
    await tx.insert(schema.payments).values({
      id: paymentId,
      orderId,
      provider: provider.id,
      providerSessionId: session.sessionId,
      amountCents: input.amountCents,
      currency: settings.currency,
      status: "pending",
    });
    return { orderId, orderToken: token, redirectUrl: session.redirectUrl, reused: false };
  });
}

export async function findOrderByToken(db: DbOrTx, token: string) {
  if (!token || token.length < 20) return null;
  const [order] = await db.select().from(schema.voucherOrders).where(eq(schema.voucherOrders.publicTokenHash, sha256(token)));
  return order ?? null;
}

export async function findPaymentBySession(db: DbOrTx, sessionId: string) {
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.providerSessionId, sessionId));
  if (!payment) return null;
  const [order] = await db.select().from(schema.voucherOrders).where(eq(schema.voucherOrders.id, payment.orderId));
  return { payment, order };
}

/* ---------------------------------------------------------------- webhooks */

export type PaymentEvent = {
  id: string;
  type: "payment.succeeded" | "payment.failed" | "payment.cancelled" | "payment.refunded";
  sessionId: string;
  amountCents: number;
  currency: string;
};

export async function handlePaymentWebhook(db: Db, provider: string, rawBody: string, signature: string | null, now = new Date()) {
  if (!verifySignature(provider, rawBody, signature)) throw new DomainError("invalid_signature", 401);
  let event: PaymentEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new DomainError("invalid_payload", 400);
  }
  if (!event?.id || !event.type || !event.sessionId) throw new DomainError("invalid_payload", 400);
  return applyPaymentEvent(db, provider, event, now);
}

export async function applyPaymentEvent(db: Db, provider: string, event: PaymentEvent, now = new Date()) {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.paymentEvents)
      .values({ provider, eventId: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ eventId: schema.paymentEvents.eventId });
    if (inserted.length === 0) return { duplicate: true as const };

    await tx.execute(sql`SELECT id FROM payments WHERE provider_session_id = ${event.sessionId} FOR UPDATE`);
    const [payment] = await tx.select().from(schema.payments).where(and(eq(schema.payments.providerSessionId, event.sessionId), eq(schema.payments.provider, provider)));
    if (!payment) throw new DomainError("payment_not_found", 404);
    await tx.update(schema.paymentEvents).set({ paymentId: payment.id }).where(and(eq(schema.paymentEvents.provider, provider), eq(schema.paymentEvents.eventId, event.id)));
    const [order] = await tx.select().from(schema.voucherOrders).where(eq(schema.voucherOrders.id, payment.orderId));

    if (event.type === "payment.succeeded") {
      if (event.amountCents !== payment.amountCents || event.currency !== payment.currency) {
        await audit(tx, `provider:${provider}`, "payment.amount_mismatch", "payment", payment.id, { expected: payment.amountCents, got: event.amountCents });
        throw new DomainError("amount_mismatch", 409);
      }
      if (payment.status === "paid") return { duplicate: true as const };
      if (payment.status === "refunded") return { ignored: "already_refunded" as const };
      // A late success after "cancelled/failed" is still money received: record it and issue.
      await tx.update(schema.payments).set({ status: "paid", updatedAt: now }).where(eq(schema.payments.id, payment.id));
      await tx.update(schema.voucherOrders).set({ status: "paid", updatedAt: now }).where(eq(schema.voucherOrders.id, order.id));
      const voucher = await issueVoucher(tx, order, now);
      await audit(tx, `provider:${provider}`, "payment.succeeded", "voucher_order", order.id, { late: payment.status !== "pending" });
      return { paid: true as const, voucherId: voucher.id };
    }
    if (event.type === "payment.failed" || event.type === "payment.cancelled") {
      if (payment.status !== "pending") return { ignored: payment.status };
      const status = event.type === "payment.failed" ? "failed" : "cancelled";
      await tx.update(schema.payments).set({ status, updatedAt: now }).where(eq(schema.payments.id, payment.id));
      await tx.update(schema.voucherOrders).set({ status, updatedAt: now }).where(eq(schema.voucherOrders.id, order.id));
      return { status };
    }
    return { ignored: event.type };
  });
}

async function issueVoucher(tx: Tx, order: typeof schema.voucherOrders.$inferSelect, now: Date) {
  const [already] = await tx.select().from(schema.vouchers).where(eq(schema.vouchers.orderId, order.id));
  if (already) return already;
  const code = newVoucherCode();
  const id = newId("vch");
  await tx.insert(schema.vouchers).values({
    id,
    orderId: order.id,
    codeHash: sha256(normalizeVoucherCode(code)),
    codeLast4: code.slice(-4),
    initialCents: order.amountCents,
    balanceCents: order.amountCents,
    currency: order.currency,
    status: "active",
    isTest: order.isTest,
  });
  await tx.insert(schema.voucherLedger).values({ id: newId("vl"), voucherId: id, type: "issue", amountCents: order.amountCents, balanceAfterCents: order.amountCents, actor: "system" });
  await enqueue(tx, {
    dedupeKey: `order:${order.id}:voucher_issued:email`,
    channel: "email",
    template: "voucher_issued",
    recipient: order.buyerEmail,
    locale: order.locale,
    payload: { orderId: order.id, sealedCode: seal(code) },
    runAt: now,
  });
  const [voucher] = await tx.select().from(schema.vouchers).where(eq(schema.vouchers.id, id));
  return voucher;
}

/* ------------------------------------------------------------------ ledger */

export async function findVoucherByCode(db: DbOrTx, code: string) {
  const [voucher] = await db.select().from(schema.vouchers).where(eq(schema.vouchers.codeHash, sha256(normalizeVoucherCode(code))));
  return voucher ?? null;
}

async function lockVoucher(tx: Tx, id: string) {
  await tx.execute(sql`SELECT id FROM vouchers WHERE id = ${id} FOR UPDATE`);
  const [voucher] = await tx.select().from(schema.vouchers).where(eq(schema.vouchers.id, id));
  if (!voucher) throw new DomainError("voucher_not_found", 404);
  return voucher;
}

export async function redeemVoucher(db: Db, input: { code: string; amountCents: number; actor: string; note?: string | null; appointmentId?: string | null; allowTest?: boolean }) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new DomainError("invalid_amount");
  const found = await findVoucherByCode(db, input.code);
  if (!found) throw new DomainError("voucher_not_found", 404);
  return db.transaction(async (tx) => {
    const voucher = await lockVoucher(tx, found.id);
    if (voucher.isTest && !input.allowTest && process.env.NODE_ENV === "production") throw new DomainError("voucher_is_test", 409);
    if (voucher.status !== "active") throw new DomainError("voucher_not_active", 409);
    if (voucher.balanceCents < input.amountCents) throw new DomainError("insufficient_balance", 409, undefined, { balanceCents: voucher.balanceCents });
    const balance = voucher.balanceCents - input.amountCents;
    await tx
      .update(schema.vouchers)
      .set({ balanceCents: balance, status: balance === 0 ? "used" : "active" })
      .where(eq(schema.vouchers.id, voucher.id));
    await tx.insert(schema.voucherLedger).values({
      id: newId("vl"),
      voucherId: voucher.id,
      type: "redeem",
      amountCents: -input.amountCents,
      balanceAfterCents: balance,
      actor: input.actor,
      note: input.note ?? null,
      appointmentId: input.appointmentId ?? null,
    });
    await audit(tx, input.actor, "voucher.redeem", "voucher", voucher.id, { amountCents: input.amountCents });
    return { voucherId: voucher.id, balanceCents: balance, last4: voucher.codeLast4 };
  });
}

/**
 * Refund (owner only): money back through the provider, voucher closed.
 * A partly redeemed voucher needs an explicit decision (`allowPartial`) and
 * refunds only the remaining balance — the ledger is never rewritten.
 */
export async function refundVoucherOrder(db: Db, orderId: string, actor: string, opts: { allowPartial?: boolean; note?: string } = {}, now = new Date()) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM voucher_orders WHERE id = ${orderId} FOR UPDATE`);
    const [order] = await tx.select().from(schema.voucherOrders).where(eq(schema.voucherOrders.id, orderId));
    if (!order) throw new DomainError("order_not_found", 404);
    if (order.status !== "paid") throw new DomainError("order_not_refundable", 409);
    const [v] = await tx.select().from(schema.vouchers).where(eq(schema.vouchers.orderId, orderId));
    let refundCents = order.amountCents;
    if (v) {
      const voucher = await lockVoucher(tx, v.id);
      if (voucher.balanceCents < voucher.initialCents && !opts.allowPartial) throw new DomainError("voucher_partially_redeemed", 409, undefined, { balanceCents: voucher.balanceCents });
      refundCents = voucher.balanceCents;
      await tx.update(schema.vouchers).set({ balanceCents: 0, status: "refunded" }).where(eq(schema.vouchers.id, voucher.id));
      await tx.insert(schema.voucherLedger).values({ id: newId("vl"), voucherId: voucher.id, type: "refund", amountCents: -voucher.balanceCents, balanceAfterCents: 0, actor, note: opts.note ?? null });
    }
    // Sandbox: the provider refund is simulated. A real adapter calls the provider API here
    // and confirms through its refund webhook.
    await tx.update(schema.payments).set({ status: "refunded", updatedAt: now }).where(eq(schema.payments.orderId, orderId));
    await tx.update(schema.voucherOrders).set({ status: "refunded", updatedAt: now }).where(eq(schema.voucherOrders.id, orderId));
    await audit(tx, actor, "voucher_order.refund", "voucher_order", orderId, { refundCents, partial: refundCents !== order.amountCents });
    return { refundCents };
  });
}

export async function voidVoucher(db: Db, voucherId: string, actor: string, note: string) {
  if (!note?.trim()) throw new DomainError("note_required");
  return db.transaction(async (tx) => {
    const voucher = await lockVoucher(tx, voucherId);
    if (voucher.status !== "active") throw new DomainError("voucher_not_active", 409);
    await tx.update(schema.vouchers).set({ balanceCents: 0, status: "void" }).where(eq(schema.vouchers.id, voucherId));
    await tx.insert(schema.voucherLedger).values({ id: newId("vl"), voucherId, type: "void", amountCents: -voucher.balanceCents, balanceAfterCents: 0, actor, note });
    await audit(tx, actor, "voucher.void", "voucher", voucherId);
  });
}

/** Sandbox checkout "buttons": build and sign an event, then go through the real webhook handler. */
export async function simulateSandboxPayment(db: Db, sessionId: string, outcome: "succeeded" | "failed" | "cancelled") {
  const settings = await getSettings(db);
  if (settings.paymentMode !== "sandbox") throw new DomainError("sandbox_disabled", 403);
  const found = await findPaymentBySession(db, sessionId);
  if (!found) throw new DomainError("payment_not_found", 404);
  const event: PaymentEvent = {
    id: `evt_test_${newToken().slice(0, 24)}`,
    type: `payment.${outcome}`,
    sessionId,
    amountCents: found.payment.amountCents,
    currency: found.payment.currency,
  };
  const raw = JSON.stringify(event);
  const result = await handlePaymentWebhook(db, "sandbox", raw, signPayload("sandbox", raw));
  return { order: found.order, result };
}
