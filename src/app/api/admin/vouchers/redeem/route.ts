import { z } from "zod";
import { readJson, route } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { redeemVoucher } from "@/lib/payments";

export const POST = route(async (request, db) => {
  const user = await requireStaff("therapist");
  const body = await readJson(request, z.object({ code: z.string().max(40), amountCents: z.number().int(), note: z.string().max(200).nullable().optional() }));
  // Demo database: test vouchers are redeemable so the flow can be tried end to end.
  return redeemVoucher(db, { ...body, actor: `usr:${user.id}`, allowTest: true });
});
