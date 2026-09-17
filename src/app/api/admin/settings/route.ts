import { z } from "zod";
import { eq } from "drizzle-orm";
import { readJson, route } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import { audit } from "@/lib/audit";

const url = z.string().url().max(300);

const Body = z.object({
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  mapUrl: url.nullable().optional(),
  socialLinks: z.object({ instagram: url.optional(), facebook: url.optional(), youtube: url.optional(), tiktok: url.optional() }).optional(),
  staffNotifyEmail: z.string().email().max(200).nullable().optional(),
  bookingMode: z.enum(["manual_confirmation", "instant"]).optional(),
  holdTtlMinutes: z.number().int().min(3).max(30).optional(),
  pendingTtlHours: z.number().int().min(1).max(168).optional(),
  minLeadMinutes: z.number().int().min(0).max(7 * 24 * 60).optional(),
  bookingHorizonDays: z.number().int().min(1).max(365).optional(),
  reminderHoursBefore: z.number().int().min(1).max(168).optional(),
  slotStepMinutes: z.number().int().min(5).max(120).optional(),
  whatsappEnabled: z.boolean().optional(),
  teamNote: z.string().max(500).nullable().optional(),
});

/** Owners change policy and integrations; managers may only edit the team note. */
export const PATCH = route(async (request, db) => {
  const user = await requireStaff("manager");
  const body = await readJson(request, Body);
  const fields = user.role === "owner" ? body : { teamNote: body.teamNote };
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v === "" ? null : v]));
  if (Object.keys(clean).length) {
    await db.update(schema.businessSettings).set({ ...clean, updatedAt: new Date() }).where(eq(schema.businessSettings.id, 1));
    await audit(db, `usr:${user.id}`, "settings.update", "business_settings", "1", { fields: Object.keys(clean) });
  }
  return { ok: true, applied: Object.keys(clean) };
});
