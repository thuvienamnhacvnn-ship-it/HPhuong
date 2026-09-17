import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import { getSettings } from "../catalog";
import { unseal } from "../ids";
import { addMinutes } from "../time";
import { sendEmail, sendWhatsapp, type DeliveryResult } from "./adapters";
import { claimDueJobs, enqueue } from "./queue";
import { renderAppointment, renderContactCopy, renderMagicLink, renderVoucherIssued, type Rendered } from "./templates";

const MAX_ATTEMPTS = 5;
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3035").replace(/\/$/, "");

type Job = typeof schema.notificationJobs.$inferSelect;

/** Returns a message to send, or a reason the job must not be sent anymore. */
async function prepare(db: Db, job: Job): Promise<Rendered | { cancel: string }> {
  const settings = await getSettings(db);
  const p = job.payload as Record<string, string>;

  if (job.template.startsWith("appointment_") || job.template.startsWith("staff_")) {
    const [appointment] = await db.select().from(schema.appointments).where(eq(schema.appointments.id, p.appointmentId));
    if (!appointment) return { cancel: "appointment_missing" };
    const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, appointment.customerId));
    if (job.template === "appointment_reminder") {
      if (appointment.status !== "confirmed") return { cancel: `appointment_${appointment.status}` };
      if (!appointment.startsAt || appointment.startsAt.toISOString() !== p.startsAt) return { cancel: "appointment_moved" };
    }
    if (job.template === "staff_pending_expiring" && appointment.status !== "pending") return { cancel: "already_decided" };
    if (job.channel === "whatsapp" && !(appointment.whatsappReminder && customer.whatsappOptIn && customer.phone)) {
      return { cancel: "no_whatsapp_consent" };
    }
    const manage = appointment.publicTokenSealed ? `${appUrl()}/${customer.locale}/termin/${unseal(appointment.publicTokenSealed)}` : undefined;
    return renderAppointment(job.template, appointment, customer, settings, { manage });
  }
  if (job.template === "voucher_issued") {
    const [order] = await db.select().from(schema.voucherOrders).where(eq(schema.voucherOrders.id, p.orderId));
    if (!order || !p.sealedCode) return { cancel: "voucher_payload_missing" };
    return renderVoucherIssued(order, unseal(p.sealedCode), settings);
  }
  if (job.template === "magic_link") {
    return renderMagicLink(job.recipient, unseal(p.sealedLink), job.locale === "en" ? "en" : "de", settings);
  }
  if (job.template === "contact_copy") {
    return renderContactCopy(p.name, job.locale === "en" ? "en" : "de", settings);
  }
  return { cancel: "unknown_template" };
}

export async function processDueJobs(db: Db, now = new Date()) {
  const jobs = await claimDueJobs(db, now);
  const settings = jobs.length ? await getSettings(db) : null;
  for (const job of jobs) {
    try {
      const prepared = await prepare(db, job);
      if ("cancel" in prepared) {
        await db.update(schema.notificationJobs).set({ status: "cancelled", lastError: prepared.cancel, updatedAt: now }).where(eq(schema.notificationJobs.id, job.id));
        continue;
      }
      let result: DeliveryResult;
      if (job.channel === "whatsapp") {
        result = await sendWhatsapp(db, settings!, job.id, job.recipient, prepared);
        if (result.status === "skipped") {
          // Fall back to e-mail; the dedupe key makes this a no-op when the e-mail twin already exists.
          const [appointment] = job.appointmentId
            ? await db.select().from(schema.appointments).where(eq(schema.appointments.id, job.appointmentId))
            : [];
          const [customer] = appointment ? await db.select().from(schema.customers).where(eq(schema.customers.id, appointment.customerId)) : [];
          if (customer) {
            await enqueue(db, {
              dedupeKey: job.dedupeKey.replace(/:whatsapp$/, ":email"),
              channel: "email",
              template: job.template,
              recipient: customer.email,
              locale: job.locale,
              payload: job.payload as Record<string, unknown>,
              appointmentId: job.appointmentId,
              runAt: now,
            });
          }
        }
      } else {
        result = await sendEmail(db, job.id, job.recipient, prepared);
      }
      const clearedPayload = job.template === "voucher_issued" || job.template === "magic_link"
        ? { ...(job.payload as Record<string, unknown>), sealedCode: undefined, sealedLink: undefined, cleared: true }
        : job.payload;
      await db
        .update(schema.notificationJobs)
        .set({
          status: result.status,
          lastError: result.status === "skipped" ? result.reason : null,
          providerMessageId: result.status === "sent" ? (result.providerMessageId ?? null) : null,
          payload: result.status === "skipped" ? job.payload : clearedPayload,
          updatedAt: now,
        })
        .where(eq(schema.notificationJobs.id, job.id));
    } catch (error) {
      const failedForGood = job.attempts >= MAX_ATTEMPTS;
      await db
        .update(schema.notificationJobs)
        .set({
          status: failedForGood ? "failed" : "queued",
          runAt: addMinutes(now, 2 ** job.attempts),
          lastError: (error as Error).message.slice(0, 200),
          updatedAt: now,
        })
        .where(eq(schema.notificationJobs.id, job.id));
    }
  }
  return jobs.length;
}
