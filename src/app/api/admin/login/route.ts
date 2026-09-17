import { z } from "zod";
import { clientIp, rateLimit, readJson, route } from "@/lib/http";
import { staffLogin } from "@/lib/auth";

export const POST = route(async (request, db) => {
  const body = await readJson(request, z.object({ email: z.string().max(200), password: z.string().max(200) }));
  rateLimit(`admin-login:${clientIp(request)}`, 10, 15 * 60_000);
  rateLimit(`admin-login-user:${body.email.toLowerCase()}`, 5, 15 * 60_000);
  const user = await staffLogin(db, body.email, body.password);
  return { ok: true, role: user.role };
});
