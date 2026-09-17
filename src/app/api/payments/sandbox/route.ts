import { z } from "zod";
import { clientIp, rateLimit, readJson, route } from "@/lib/http";
import { simulateSandboxPayment } from "@/lib/payments";
import { unseal } from "@/lib/ids";
import { kick } from "@/lib/background";

/** Buttons on the sandbox checkout page. Disabled unless paymentMode = sandbox. */
export const POST = route(async (request, db) => {
  rateLimit(`sandbox:${clientIp(request)}`, 20, 60_000);
  const body = await readJson(request, z.object({ sessionId: z.string().max(100), outcome: z.enum(["succeeded", "failed", "cancelled"]) }));
  const { order, result } = await simulateSandboxPayment(db, body.sessionId, body.outcome);
  kick();
  return { orderToken: order.publicTokenSealed ? unseal(order.publicTokenSealed) : null, locale: order.locale, result };
});
