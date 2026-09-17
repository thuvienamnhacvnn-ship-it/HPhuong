import { z } from "zod";
import { eq } from "drizzle-orm";
import { readJson, withParams } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";

export const PATCH = withParams<{ id: string }>(async (request, db, { id }) => {
  await requireStaff("manager");
  const { status } = await readJson(request, z.object({ status: z.enum(["open", "answered", "spam"]) }));
  await db.update(schema.contactTickets).set({ status }).where(eq(schema.contactTickets.id, id));
  return { ok: true };
});
