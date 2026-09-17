import { z } from "zod";
import { clientIp, rateLimit, readJson, route } from "@/lib/http";
import { assistantEnabled, chat } from "@/lib/assistant";

const Body = z.object({
  locale: z.enum(["de", "en"]),
  turns: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).max(30),
});

export const GET = route(async () => ({ enabled: assistantEnabled() }));

export const POST = route(async (request, db) => {
  rateLimit(`ai:${clientIp(request)}`, 20, 10 * 60_000);
  const body = await readJson(request, Body);
  try {
    return await chat(db, body.turns, body.locale);
  } catch (error) {
    console.error("[assistant]", (error as Error).message);
    return { mode: "unavailable", text: "", cards: [], handoff: false };
  }
});
