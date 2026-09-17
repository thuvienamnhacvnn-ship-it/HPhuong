import { z } from "zod";
import { clientIp, rateLimit, readJson, route } from "@/lib/http";
import { createHold, releaseHold } from "@/lib/scheduling";

const Create = z.object({
  serviceId: z.string().max(80),
  variantId: z.string().max(20),
  date: z.string().max(10),
  time: z.string().max(5),
  staffId: z.string().max(40).nullable().optional(),
  previousHoldToken: z.string().max(100).optional(),
});

export const POST = route(async (request, db) => {
  rateLimit(`hold:${clientIp(request)}`, 30, 60_000);
  const body = await readJson(request, Create);
  // Changing the selection releases the previous hold instead of stacking holds.
  if (body.previousHoldToken) await releaseHold(db, body.previousHoldToken);
  const hold = await createHold(db, body);
  return { holdToken: hold.holdToken, expiresAt: hold.expiresAt, startsAt: hold.startsAt, endsAt: hold.endsAt, totalCents: hold.totalCents };
});

export const DELETE = route(async (request, db) => {
  const { holdToken } = await readJson(request, z.object({ holdToken: z.string().max(100) }));
  return { released: await releaseHold(db, holdToken) };
});
