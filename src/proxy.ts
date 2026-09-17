import { NextResponse, type NextRequest } from "next/server";

/**
 * - "/" and "/de" → "/de/start" (EN visitors keep "/en/…")
 * - CSRF: state-changing API calls must come from our own origin.
 *   Payment webhooks are exempt; they are authenticated by signature.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const prefersEn = /^en\b/i.test(request.headers.get("accept-language") ?? "");
    return NextResponse.redirect(new URL(prefersEn ? "/en/start" : "/de/start", request.url));
  }
  if (pathname === "/de" || pathname === "/en") {
    return NextResponse.redirect(new URL(`${pathname}/start`, request.url));
  }

  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method) && !pathname.startsWith("/api/webhooks/")) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let sameOrigin = false;
    try {
      sameOrigin = !!origin && !!host && new URL(origin).host === host;
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/de", "/en", "/api/:path*"],
};
