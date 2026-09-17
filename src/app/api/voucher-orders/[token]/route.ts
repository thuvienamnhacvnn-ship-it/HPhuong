import { eq } from "drizzle-orm";
import { withParams } from "@/lib/http";
import { findOrderByToken } from "@/lib/payments";
import { schema } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { addMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Status polling for the order page. Never returns the voucher code. */
export const GET = withParams<{ token: string }>(async (_request, db, { token }) => {
  const order = await findOrderByToken(db, token);
  if (!order || addMinutes(order.createdAt, 30 * 24 * 60) < new Date()) throw new DomainError("order_not_found", 404);
  const [voucher] = await db.select().from(schema.vouchers).where(eq(schema.vouchers.orderId, order.id));
  return {
    status: order.status,
    amountCents: order.amountCents,
    currency: order.currency,
    isTest: order.isTest,
    voucherIssued: !!voucher,
  };
});
