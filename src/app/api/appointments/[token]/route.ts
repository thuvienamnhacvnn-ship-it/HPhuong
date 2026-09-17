import { z } from "zod";
import { readJson, withParams } from "@/lib/http";
import { appointmentTokenValid, cancelAppointment, findAppointmentByToken } from "@/lib/scheduling";
import { DomainError } from "@/lib/errors";
import { kick } from "@/lib/background";

/** Guest link actions. The token is scoped to one appointment and expires 30 days after it. */
export const PATCH = withParams<{ token: string }>(async (request, db, { token }) => {
  const { action } = await readJson(request, z.object({ action: z.literal("cancel") }));
  const appointment = await findAppointmentByToken(db, token);
  if (!appointment || !appointmentTokenValid(appointment)) throw new DomainError("appointment_not_found", 404);
  if (action === "cancel") {
    const updated = await cancelAppointment(db, appointment.id, "guest-link", null);
    kick();
    return { status: updated.status };
  }
});
