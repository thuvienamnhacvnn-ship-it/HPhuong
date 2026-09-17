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
