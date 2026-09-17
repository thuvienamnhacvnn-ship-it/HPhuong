import { z } from "zod";
import { readJson, withParams } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { refundVoucherOrder } from "@/lib/payments";

export const POST = withParams<{ id: string }>(async (request, db, { id }) => {
  const user = await requireStaff("owner");
  const body = await readJson(request, z.object({ allowPartial: z.boolean().optional(), note: z.string().max(300).optional() }));
  return refundVoucherOrder(db, id, `usr:${user.id}`, body);
});
