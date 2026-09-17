/**
 * Notification job queue.
 *
 * Every message is a row with a dedupe key (entity:event:channel[:variant]).
 * Inserting the same key twice is a no-op, so retries, double clicks and
 * repeated webhooks can never send a second confirmation or voucher e-mail.
 * Jobs are created inside the business transaction that caused them.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import type { DbOrTx } from "../db";
import { rowsOf, schema } from "../db";
import { newId } from "../ids";
import { addMinutes } from "../time";
import type { Settings } from "../catalog";

type Appointment = typeof schema.appointments.$inferSelect;
type Customer = typeof schema.customers.$inferSelect;

export type AppointmentEvent =
  | "request_received"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "expired"
  | "rescheduled"
  | "staff_new_request";

export type JobInput = {
  dedupeKey: string;
  channel: "email" | "whatsapp";
  template: string;
  recipient: string;
  locale: string;
  payload: Record<string, unknown>;
  appointmentId?: string | null;
  runAt: Date;
};

export async function enqueue(db: DbOrTx, job: JobInput) {
  await db
    .insert(schema.notificationJobs)
    .values({ id: newId("job"), status: "queued", ...job, appointmentId: job.appointmentId ?? null })
    .onConflictDoNothing({ target: schema.notificationJobs.dedupeKey });
}

/** Customer may receive WhatsApp only with explicit opt-in on this booking AND a phone number. */
export function whatsappAllowed(appointment: Appointment, customer: Customer) {
  return appointment.whatsappReminder && customer.whatsappOptIn && !!customer.phone;
}

export async function enqueueAppointmentNotifications(
  db: DbOrTx,
  appointment: Appointment,
  customer: Customer,
  event: AppointmentEvent,
  settings: Settings,
  now = new Date(),
) {
  const payload = { appointmentId: appointment.id };
  const version = appointment.startsAt ? appointment.startsAt.toISOString() : "request";
  const base = `appt:${appointment.id}:${event}:${event === "rescheduled" ? version : appointment.updatedAt.toISOString()}`;

  if (event === "staff_new_request") {
    if (settings.staffNotifyEmail) {
      await enqueue(db, { dedupeKey: `${base}:email`, channel: "email", template: "staff_new_request", recipient: settings.staffNotifyEmail, locale: "de", payload, appointmentId: appointment.id, runAt: now });
      if (appointment.pendingExpiresAt) {
        const warnAt = addMinutes(appointment.pendingExpiresAt, -120);
        if (warnAt > now) {
          await enqueue(db, { dedupeKey: `appt:${appointment.id}:staff_expiring:${appointment.pendingExpiresAt.toISOString()}:email`, channel: "email", template: "staff_pending_expiring", recipient: settings.staffNotifyEmail, locale: "de", payload, appointmentId: appointment.id, runAt: warnAt });
        }
      }
    }
    return;
  }

  await enqueue(db, { dedupeKey: `${base}:email`, channel: "email", template: `appointment_${event}`, recipient: customer.email, locale: customer.locale, payload, appointmentId: appointment.id, runAt: now });

  if (["confirmed", "rescheduled", "cancelled"].includes(event) && whatsappAllowed(appointment, customer)) {
    await enqueue(db, { dedupeKey: `${base}:whatsapp`, channel: "whatsapp", template: `appointment_${event}`, recipient: customer.phone!, locale: customer.locale, payload, appointmentId: appointment.id, runAt: now });
  }

  if ((event === "confirmed" || event === "rescheduled") && appointment.status === "confirmed" && appointment.startsAt) {
    const runAt = addMinutes(appointment.startsAt, -settings.reminderHoursBefore * 60);
    if (runAt > now) {
      const key = `appt:${appointment.id}:reminder:${appointment.startsAt.toISOString()}`;
      await enqueue(db, { dedupeKey: `${key}:email`, channel: "email", template: "appointment_reminder", recipient: customer.email, locale: customer.locale, payload: { ...payload, startsAt: appointment.startsAt.toISOString() }, appointmentId: appointment.id, runAt });
      if (whatsappAllowed(appointment, customer)) {
        await enqueue(db, { dedupeKey: `${key}:whatsapp`, channel: "whatsapp", template: "appointment_reminder", recipient: customer.phone!, locale: customer.locale, payload: { ...payload, startsAt: appointment.startsAt.toISOString() }, appointmentId: appointment.id, runAt });
      }
    }
  }
}

/** Cancelled or moved appointments must never get the old reminder. */
export async function cancelQueuedJobs(db: DbOrTx, appointmentId: string, now = new Date()) {
  await db
    .update(schema.notificationJobs)
    .set({ status: "cancelled", updatedAt: now, lastError: "appointment_changed" })
    .where(
      and(
        eq(schema.notificationJobs.appointmentId, appointmentId),
        eq(schema.notificationJobs.status, "queued"),
        inArray(schema.notificationJobs.template, ["appointment_reminder", "staff_pending_expiring"]),
      ),
    );
}

export async function claimDueJobs(db: DbOrTx, now: Date, limit = 20) {
  const rows = await db.execute(sql`
    UPDATE notification_jobs SET status = 'sending', attempts = attempts + 1, updated_at = ${now}
    WHERE id IN (
      SELECT id FROM notification_jobs
      WHERE status = 'queued' AND run_at <= ${now}
      ORDER BY run_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`);
  const ids = rowsOf<{ id: string }>(rows).map((r) => r.id);
  if (!ids.length) return [];
  return db.select().from(schema.notificationJobs).where(inArray(schema.notificationJobs.id, ids));
}
