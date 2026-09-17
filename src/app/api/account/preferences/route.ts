import { z } from "zod";
import { eq } from "drizzle-orm";
import { readJson, route } from "@/lib/http";
import { currentCustomer } from "@/lib/auth";
import { schema } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { WHATSAPP_CONSENT_VERSION } from "@/lib/scheduling";

/** Marketing preferences are separate from transactional e-mails; every change is logged as consent. */
export const PATCH = route(async (request, db) => {
  const customer = await currentCustomer();
  if (!customer) throw new DomainError("unauthorized", 401);
  const body = await readJson(request, z.object({ marketingEmail: z.boolean().optional(), whatsappOptIn: z.boolean().optional() }));
  if (body.whatsappOptIn && !customer.phone) throw new DomainError("phone_required_for_whatsapp");
  await db.transaction(async (tx) => {
    if (body.marketingEmail !== undefined && body.marketingEmail !== customer.marketingEmail) {
      await tx.update(schema.customers).set({ marketingEmail: body.marketingEmail }).where(eq(schema.customers.id, customer.id));
      await tx.insert(schema.consents).values({ id: newId("con"), customerId: customer.id, channel: "marketing_email", granted: body.marketingEmail, source: "account", textVersion: "marketing-email-v1" });
    }
    if (body.whatsappOptIn !== undefined && body.whatsappOptIn !== customer.whatsappOptIn) {
      await tx.update(schema.customers).set({ whatsappOptIn: body.whatsappOptIn }).where(eq(schema.customers.id, customer.id));
      await tx.insert(schema.consents).values({ id: newId("con"), customerId: customer.id, channel: "whatsapp", granted: body.whatsappOptIn, source: "account", textVersion: WHATSAPP_CONSENT_VERSION });
    }
  });
  return { ok: true };
});
