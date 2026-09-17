import { withParams } from "@/lib/http";
import { handlePaymentWebhook } from "@/lib/payments";
import { DomainError } from "@/lib/errors";
import { kick } from "@/lib/background";

/**
 * Provider webhooks. Authenticated by HMAC signature over the raw body
 * (header `x-hphuong-signature`); idempotent by event id. A real provider
 * adapter verifies with the provider's own signature scheme here.
 */
export const POST = withParams<{ provider: string }>(async (request, db, { provider }) => {
  if (provider !== "sandbox") throw new DomainError("unknown_provider", 404);
  const raw = await request.text();
  const result = await handlePaymentWebhook(db, provider, raw, request.headers.get("x-hphuong-signature"));
  kick();
  return { received: true, ...result };
});
