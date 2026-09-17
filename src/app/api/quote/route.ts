import { z } from "zod";
import { readJson, route } from "@/lib/http";
import { quote } from "@/lib/catalog";

const Body = z.object({ serviceId: z.string().max(80).optional(), variantId: z.string().max(20).optional(), offerId: z.string().max(80).optional() });

export const POST = route(async (request, db) => quote(db, await readJson(request, Body)));
