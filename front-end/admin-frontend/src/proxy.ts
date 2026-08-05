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
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
