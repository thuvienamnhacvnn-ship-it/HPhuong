/**
 * Delivery adapters. Each returns what really happened — never "delivered"
 * when nothing left the server.
 *
 *  email:    RESEND_API_KEY + MAIL_FROM  → Resend HTTP API
 *            otherwise                   → dev outbox table (status dev_outbox)
 *  whatsapp: official WhatsApp Cloud API, only when the owner enabled it in
 *            settings AND WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID +
 *            an approved template name are configured. No personal-session
 *            automation, no laptop that must stay on.
 */
import type { DbOrTx } from "../db";
import { schema } from "../db";
import { newId } from "../ids";
import type { Rendered } from "./templates";

export type DeliveryResult =
  | { status: "sent"; providerMessageId?: string }
  | { status: "dev_outbox" }
  | { status: "skipped"; reason: string };

export function emailProvider() {
  return process.env.RESEND_API_KEY && process.env.MAIL_FROM ? "resend" : "dev_outbox";
}

export function whatsappConfigured(settings: { whatsappEnabled: boolean }) {
  return settings.whatsappEnabled && !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
}

export async function sendEmail(db: DbOrTx, jobId: string, to: string, message: Rendered): Promise<DeliveryResult> {
  if (emailProvider() === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": jobId },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`resend_http_${response.status}`);
    const data = (await response.json()) as { id?: string };
    return { status: "sent", providerMessageId: data.id };
  }
  await db.insert(schema.outbox).values({ id: newId("out"), jobId, channel: "email", recipient: to, subject: message.subject, body: message.text });
  return { status: "dev_outbox" };
}

export async function sendWhatsapp(
  db: DbOrTx,
  settings: { whatsappEnabled: boolean },
  jobId: string,
  to: string,
  message: Rendered,
): Promise<DeliveryResult> {
  if (!whatsappConfigured(settings)) return { status: "skipped", reason: "whatsapp_not_configured" };
  if (!message.whatsappTemplate) return { status: "skipped", reason: "whatsapp_template_missing" };
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/[^0-9]/g, ""),
      type: "template",
      template: {
        name: message.whatsappTemplate,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "de" },
        components: [{ type: "body", parameters: (message.whatsappParams ?? []).map((text) => ({ type: "text", text })) }],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`whatsapp_http_${response.status}`);
  const data = (await response.json()) as { messages?: { id: string }[] };
  void db;
  return { status: "sent", providerMessageId: data.messages?.[0]?.id };
}

/**
 * Message to the owner's own WhatsApp when a booking comes in. Order:
 *  1. CALLMEBOT_APIKEY (+ OWNER_WHATSAPP_PHONE): free CallMeBot gateway, owner activates once.
 *  2. Official Cloud API (same env as customer messages) with WHATSAPP_TEMPLATE_OWNER_NEW.
 *  3. Nothing configured: written to the dev outbox, status dev_outbox (never "sent").
 */
export async function sendOwnerWhatsapp(db: DbOrTx, settings: { whatsappEnabled: boolean }, jobId: string, to: string, message: Rendered): Promise<DeliveryResult> {
  const key = process.env.CALLMEBOT_APIKEY;
  if (key) {
    const base = process.env.CALLMEBOT_URL ?? "https://api.callmebot.com/whatsapp.php";
    const url = `${base}?phone=${encodeURIComponent(to)}&text=${encodeURIComponent(message.text)}&apikey=${encodeURIComponent(key)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`callmebot_http_${response.status}`);
    return { status: "sent" };
  }
  if (whatsappConfigured(settings) && message.whatsappTemplate) return sendWhatsapp(db, settings, jobId, to, message);
  await db.insert(schema.outbox).values({ id: newId("out"), jobId, channel: "whatsapp", recipient: to, subject: message.subject, body: message.text });
  return { status: "dev_outbox" };
}

/** SMS via seven.io (German gateway). SMS_API_KEY required; SMS_FROM is the sender name (max 11 chars). */
export async function sendSms(to: string, message: Rendered): Promise<DeliveryResult> {
  const key = process.env.SMS_API_KEY;
  if (!key) return { status: "skipped", reason: "sms_not_configured" };
  const base = process.env.SMS_URL ?? "https://gateway.seven.io/api/sms";
  const body = new URLSearchParams({ to: to.replace(/[^0-9]/g, ""), text: message.smsText ?? message.text.slice(0, 300), from: process.env.SMS_FROM ?? "HPHUONG", json: "1" });
  const response = await fetch(base, { method: "POST", headers: { "X-Api-Key": key, Accept: "application/json" }, body, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`sms_http_${response.status}`);
  const data = (await response.json().catch(() => ({}))) as { success?: string | boolean };
  if (data.success !== undefined && String(data.success) !== "100" && data.success !== true) throw new Error(`sms_rejected_${String(data.success)}`);
  return { status: "sent" };
}
