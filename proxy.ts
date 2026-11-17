import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Blocks every page and API route without a valid session.
 * Not covered (see matcher): /login, /api/auth/* (login flow),
 * /api/jobs/* (they check CRON_SECRET themselves), Next.js assets,
 * and the PWA manifest and icons (the browser fetches them without cookies).
 */
export async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Proxy needs an absolute URL; here request.url keeps the host you used.
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/jobs|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-touch-icon.png).*)",
  ],
};
