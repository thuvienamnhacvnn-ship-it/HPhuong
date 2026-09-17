import { z } from "zod";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { readJson, route } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { getSettings } from "@/lib/catalog";
import { zonedToUtc } from "@/lib/time";

const Create = z.object({
  resourceId: z.string().max(40).nullable(),
  date: z.string().max(10),
  from: z.string().max(5),
  toDate: z.string().max(10),
  to: z.string().max(5),
  reason: z.string().max(200).nullable().optional(),
});

/**
 * Block a resource (or the whole studio when resourceId is null). Existing
 * active bookings in that window are reported back so staff can move them —
 * a block never silently deletes a booking.
 */
export const POST = route(async (request, db) => {
  const user = await requireStaff("manager");
  const body = await readJson(request, Create);
  const settings = await getSettings(db);
  const startsAt = zonedToUtc(body.date, body.from, settings.timezone);
  const endsAt = zonedToUtc(body.toDate, body.to, settings.timezone);
  if (!startsAt || !endsAt || endsAt <= startsAt) throw new DomainError("invalid_date");
  const id = newId("off");
  await db.insert(schema.timeOff).values({ id, resourceId: body.resourceId, startsAt, endsAt, reason: body.reason ?? null, createdBy: user.id });
  await audit(db, `usr:${user.id}`, "time_off.create", "time_off", id);
  const conflicts = await db
    .select({ appointmentId: schema.resourceAllocations.appointmentId })
    .from(schema.resourceAllocations)
    .where(
      and(
        isNull(schema.resourceAllocations.releasedAt),
        gt(schema.resourceAllocations.blocksUntil, new Date()),
        lt(schema.resourceAllocations.startsAt, endsAt),
        gt(schema.resourceAllocations.endsAt, startsAt),
        ...(body.resourceId ? [eq(schema.resourceAllocations.resourceId, body.resourceId)] : []),
      ),
    );
  return { id, conflictingAppointments: [...new Set(conflicts.map((c) => c.appointmentId).filter(Boolean))] };
});

export const DELETE = route(async (request, db) => {
  const user = await requireStaff("manager");
  const { id } = await readJson(request, z.object({ id: z.string().max(40) }));
  await db.delete(schema.timeOff).where(eq(schema.timeOff.id, id));
  await audit(db, `usr:${user.id}`, "time_off.delete", "time_off", id);
  return { ok: true };
});
