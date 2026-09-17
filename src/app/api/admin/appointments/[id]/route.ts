import { z } from "zod";
import { readJson, withParams } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { approveAppointment, cancelAppointment, rejectAppointment, rescheduleAppointment, scheduleRequest } from "@/lib/scheduling";
import { kick } from "@/lib/background";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().max(300).nullable().optional() }),
  z.object({ action: z.literal("cancel"), reason: z.string().max(300).nullable().optional() }),
  z.object({ action: z.literal("reschedule"), date: z.string().max(10), time: z.string().max(5), staffId: z.string().max(40).nullable().optional() }),
  z.object({ action: z.literal("schedule"), date: z.string().max(10), time: z.string().max(5), staffId: z.string().max(40).nullable().optional() }),
]);

/** Every calendar change (incl. drag & drop) goes through here and is validated by the engine. */
export const PATCH = withParams<{ id: string }>(async (request, db, { id }) => {
  const user = await requireStaff("manager");
  const body = await readJson(request, Body);
  const actor = `usr:${user.id}`;
  let result;
  switch (body.action) {
    case "approve":
      result = await approveAppointment(db, id, actor);
      break;
    case "reject":
      result = await rejectAppointment(db, id, actor, body.reason ?? null);
      break;
    case "cancel":
      result = await cancelAppointment(db, id, actor, body.reason ?? null);
      break;
    case "reschedule":
      result = await rescheduleAppointment(db, id, body, { kind: "staff", id: user.id });
      break;
    case "schedule":
      result = await scheduleRequest(db, id, body, actor);
      break;
  }
  kick();
  return { status: result.status, startsAt: result.startsAt };
});
