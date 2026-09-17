import { z } from "zod";
import { clientIp, rateLimit, readJson, route } from "@/lib/http";
import { schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { DomainError } from "@/lib/errors";
import { enqueue } from "@/lib/notifications/queue";
import { kick } from "@/lib/background";

const Body = z.object({
  name: z.string().max(120),
  email: z.string().max(200),
  message: z.string().max(500),
  locale: z.enum(["de", "en"]),
  website: z.string().max(200).optional(), // honeypot — humans never see it
  startedAt: z.number().optional(), // form render time
});

export const POST = route(async (request, db) => {
  rateLimit(`contact:${clientIp(request)}`, 5, 10 * 60_000);
  const body = await readJson(request, Body);
  if (!body.name.trim()) throw new DomainError("invalid_name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) throw new DomainError("invalid_email");
  if (body.message.trim().length < 5) throw new DomainError("invalid_message");
  const looksLikeBot = !!body.website || (body.startedAt && Date.now() - body.startedAt < 2500);
  const id = newId("tkt");
  await db.insert(schema.contactTickets).values({
    id,
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    message: body.message.trim(),
    locale: body.locale,
    status: looksLikeBot ? "spam" : "open",
  });
  if (!looksLikeBot) {
    await enqueue(db, { dedupeKey: `ticket:${id}:copy:email`, channel: "email", template: "contact_copy", recipient: body.email.trim().toLowerCase(), locale: body.locale, payload: { name: body.name.trim() }, runAt: new Date() });
    kick();
  }
  // Same answer for bots, so the honeypot is not revealed.
  return { ok: true };
});
