import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

// The httpOnly admin_token cookie is the only credential the browser ever
// holds for this app (see lib/admin-auth.ts) — it's also the only thing a
// page-navigation request can carry automatically, so it's the only thing
// worth checking here. (This used to also check Authorization/x-admin-token
// headers, which a normal browser navigation never sends — that check was
// dead weight that looked like defense but wasn't.)
function hasAdminToken(request: NextRequest): boolean {
  return Boolean(request.cookies.get("admin_token")?.value);
}

// Presence of admin_token only means a cookie exists, not that the backend
// still considers it valid — the proxy can't verify the JWT itself. When an
// API call discovers the token is actually dead (401), lib/admin-api.ts sets
// this plain marker cookie synchronously (no network round trip, so it can't
// itself be blocked by whatever caused the 401) right before navigating to
// /login. Without it, the rule below would see the still-present stale
// admin_token and immediately bounce back to "/", which re-fetches
// everything, 401s again, and loops.
function hasForceLogin(request: NextRequest): boolean {
  return Boolean(request.cookies.get("force_login")?.value);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = hasAdminToken(request);
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!hasToken && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasToken && pathname === "/login") {
    if (hasForceLogin(request)) {
      const response = NextResponse.next();
      response.cookies.delete("force_login");
      return response;
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
