import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { consumeMagicLink, CUSTOMER_COOKIE } from "@/lib/auth";

export async function GET(request: Request, ctx: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await ctx.params;
  const locale = raw === "en" ? "en" : "de";
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const db = await getDb();
  const result = token.length > 20 ? await consumeMagicLink(db, token, locale) : null;
  if (!result) return NextResponse.redirect(new URL(`/${locale}/login?error=expired`, request.url));
  // Redirect drops the token from the address bar and history.
  const response = NextResponse.redirect(new URL(`/${locale}/konto`, request.url));
  response.cookies.set(CUSTOMER_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
