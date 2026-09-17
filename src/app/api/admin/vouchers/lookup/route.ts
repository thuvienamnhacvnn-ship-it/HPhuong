import { z } from "zod";
import { readJson, route } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { findVoucherByCode } from "@/lib/payments";
import { DomainError } from "@/lib/errors";
import { audit } from "@/lib/audit";

/** Code goes in the POST body, never in a URL (URLs end up in logs). */
export const POST = route(async (request, db) => {
  const user = await requireStaff("therapist");
  const { code } = await readJson(request, z.object({ code: z.string().max(40) }));
  const voucher = await findVoucherByCode(db, code);
  await audit(db, `usr:${user.id}`, "voucher.lookup", "voucher", voucher?.id ?? null, { found: !!voucher });
  if (!voucher) throw new DomainError("voucher_not_found", 404);
  return { id: voucher.id, last4: voucher.codeLast4, balanceCents: voucher.balanceCents, initialCents: voucher.initialCents, status: voucher.status, isTest: voucher.isTest };
});
