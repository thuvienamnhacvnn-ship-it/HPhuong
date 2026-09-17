import { z } from "zod";
import { clientIp, rateLimit, readJson, route } from "@/lib/http";
import { createVoucherOrder } from "@/lib/payments";

const Body = z.object({
  amountCents: z.number().int(),
  buyerName: z.string().max(120),
  buyerEmail: z.string().max(200),
  recipientName: z.string().max(120).nullable().optional(),
  message: z.string().max(1000).nullable().optional(),
  paymentMethod: z.enum(["card", "paypal"]),
  idempotencyKey: z.string().max(80),
  locale: z.enum(["de", "en"]),
});

export const POST = route(async (request, db) => {
  rateLimit(`order:${clientIp(request)}`, 10, 10 * 60_000);
  const result = await createVoucherOrder(db, await readJson(request, Body));
  return { redirectUrl: result.redirectUrl, orderToken: result.orderToken };
});
