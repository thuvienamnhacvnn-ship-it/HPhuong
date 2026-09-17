import { sql } from "drizzle-orm";
import { route } from "@/lib/http";
import { getSettings } from "@/lib/catalog";
import { assistantEnabled } from "@/lib/assistant";
import { emailProvider, whatsappConfigured } from "@/lib/notifications/adapters";

export const dynamic = "force-dynamic";

/** Health check + which integrations are live, sandboxed or mocked. No secrets. */
export const GET = route(async (_request, db) => {
  await db.execute(sql`SELECT 1`);
  const settings = await getSettings(db);
  return {
    ok: true,
    database: process.env.DATABASE_URL ? "postgres" : "pglite",
    demo: settings.isDemo,
    integrations: {
      assistant: assistantEnabled() ? "claude" : "rule_based_fallback",
      email: emailProvider(),
      whatsapp: whatsappConfigured(settings) ? "cloud_api" : "disabled",
      payments: settings.paymentMode,
    },
  };
});
