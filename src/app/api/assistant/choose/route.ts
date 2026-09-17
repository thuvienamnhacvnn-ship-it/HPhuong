import { z } from "zod";
import { readJson, route } from "@/lib/http";
import { choose } from "@/lib/assistant";

const Body = z.object({
  goal: z.enum(["entspannung", "gesicht", "kopf", "fuesse", "egal"]),
  maxMinutes: z.number().int().min(0).max(600).nullable().optional(),
  budgetCents: z.number().int().min(0).max(100000).nullable().optional(),
});

export const POST = route(async (request, db) => choose(db, await readJson(request, Body)));
