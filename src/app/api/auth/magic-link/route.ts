import { z } from "zod";
import { clientIp, rateLimit, readJson, route } from "@/lib/http";
import { requestMagicLink } from "@/lib/auth";
import { kick } from "@/lib/background";

export const POST = route(async (request, db) => {
  const body = await readJson(request, z.object({ email: z.string().max(200), locale: z.enum(["de", "en"]) }));
  rateLimit(`magic:${clientIp(request)}`, 5, 10 * 60_000);
  rateLimit(`magic-email:${body.email.trim().toLowerCase()}`, 3, 10 * 60_000);
  await requestMagicLink(db, body.email, body.locale);
  kick();
  return { ok: true };
});
