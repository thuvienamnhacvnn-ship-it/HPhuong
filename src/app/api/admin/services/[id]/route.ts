import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { readJson, withParams } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";

const Body = z.object({
  visible: z.boolean().optional(),
  bookable: z.boolean().optional(),
  contentApproved: z.boolean().optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(120).optional(),
  bufferAfterMinutes: z.number().int().min(0).max(120).optional(),
  videoUrl: z.string().url().max(500).nullable().optional(),
  teaser: z.object({ de: z.string().max(200), en: z.string().max(200) }).optional(),
  description: z.object({ de: z.string().max(2000), en: z.string().max(2000) }).optional(),
  skills: z.array(z.string().max(40)).optional(),
  variants: z
    .array(z.object({ id: z.string().max(20), minutes: z.number().int().min(5).max(480), priceCents: z.number().int().min(0).max(1_000_000), active: z.boolean() }))
    .optional(),
});

/**
 * Owner/manager edit of a service. Price and duration changes never touch
 * existing appointments — those keep their snapshot.
 */
export const PATCH = withParams<{ id: string }>(async (request, db, { id }) => {
  const user = await requireStaff("manager");
  const body = await readJson(request, Body);
  const [service] = await db.select().from(schema.services).where(eq(schema.services.id, id));
  if (!service) throw new DomainError("service_not_found", 404);
  if (body.variants && user.role !== "owner") throw new DomainError("forbidden", 403); // prices: owner only
  await db.transaction(async (tx) => {
    const { variants, skills, ...fields } = body;
    if (Object.keys(fields).length) await tx.update(schema.services).set(fields).where(eq(schema.services.id, id));
    for (const v of variants ?? []) {
      const [existing] = await tx.select().from(schema.serviceVariants).where(and(eq(schema.serviceVariants.serviceId, id), eq(schema.serviceVariants.id, v.id)));
      if (existing) await tx.update(schema.serviceVariants).set({ minutes: v.minutes, priceCents: v.priceCents, active: v.active }).where(and(eq(schema.serviceVariants.serviceId, id), eq(schema.serviceVariants.id, v.id)));
      else await tx.insert(schema.serviceVariants).values({ serviceId: id, ...v });
    }
    if (skills) {
      await tx.delete(schema.staffSkills).where(eq(schema.staffSkills.serviceId, id));
      if (skills.length) await tx.insert(schema.staffSkills).values(skills.map((staffId) => ({ staffId, serviceId: id })));
    }
    await audit(tx, `usr:${user.id}`, "service.update", "service", id, { fields: Object.keys(body) });
  });
  return { ok: true };
});
