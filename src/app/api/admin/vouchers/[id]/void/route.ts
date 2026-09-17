import { z } from "zod";
import { readJson, withParams } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { voidVoucher } from "@/lib/payments";

export const POST = withParams<{ id: string }>(async (request, db, { id }) => {
  const user = await requireStaff("owner");
  const { note } = await readJson(request, z.object({ note: z.string().max(300) }));
  await voidVoucher(db, id, `usr:${user.id}`, note);
  return { ok: true };
});
