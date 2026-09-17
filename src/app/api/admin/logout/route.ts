import { route } from "@/lib/http";
import { logout } from "@/lib/auth";

export const POST = route(async () => {
  await logout("staff");
  return { ok: true };
});
