import { z } from "zod";
import { clientIp, rateLimit, readJson, route } from "@/lib/http";
import { submitAppointment } from "@/lib/scheduling";
import { kick } from "@/lib/background";

const Body = z.object({
  holdToken: z.string().max(100),
  name: z.string().max(120),
  email: z.string().max(200),
  phone: z.string().max(30).nullable().optional(),
  whatsappReminder: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
  locale: z.enum(["de", "en"]),
});

export const POST = route(async (request, db) => {
  rateLimit(`book:${clientIp(request)}`, 10, 10 * 60_000);
  const result = await submitAppointment(db, await readJson(request, Body));
  kick();
  return { status: result.status, publicToken: result.publicToken };
});
