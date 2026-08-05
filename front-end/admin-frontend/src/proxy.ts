import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

// Helper to check for admin token in cookies or headers
function hasAdminToken(request: NextRequest): boolean {
  // Check cookie first
  if (request.cookies.get("admin_token")?.value) {
    return true;
  }

  // Check Authorization header (for localStorage fallback via client-side header)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return true;
  }

  // Check custom header that client can set from localStorage
  const xAdminToken = request.headers.get("x-admin-token");
  if (xAdminToken) {
    return true;
  }

  return false;
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
