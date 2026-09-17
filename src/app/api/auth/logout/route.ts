import { route } from "@/lib/http";
import { logout } from "@/lib/auth";

export const POST = route(async () => {
  await logout("customer");
  return { ok: true };
});
