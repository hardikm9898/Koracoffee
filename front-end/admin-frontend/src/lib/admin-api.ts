const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

// The admin_token session cookie is SameSite=Lax, which withholds the
// cookie on cross-*site* requests — and browsers treat "localhost" and a
// raw LAN IP as different sites even when they're the same machine. If this
// page was opened via a host that doesn't match NEXT_PUBLIC_API_BASE_URL
// (e.g. a LAN IP like 192.168.x.x while the env var still says
// "localhost"), keep the API call on the SAME host the browser actually
// used so the cookie set at login is still same-site on every later
// request. Without this, login "succeeds" (a response can always set a
// cookie) but the very next request comes back as if there's no session.
const resolveApiBaseUrl = () => {
  if (typeof window === "undefined") return DEFAULT_API_BASE_URL;

  try {
    const url = new URL(DEFAULT_API_BASE_URL);
    if (url.hostname !== window.location.hostname) {
      url.hostname = window.location.hostname;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_API_BASE_URL;
  }
};

const buildAdminUrl = (path: string) => `${resolveApiBaseUrl()}${path}`;

// Auth is carried exclusively by the httpOnly admin_token cookie the backend
// sets on login. On the client, `credentials: "include"` below is enough —
// the browser attaches the cookie automatically. On the server (SSR), fetch
// doesn't automatically forward the incoming request's cookies, so we copy
// them across explicitly here.
const withServerCookies = async (init: RequestInit = {}) => {
  const headers = new Headers(init.headers);

  if (typeof window === "undefined" && !headers.has("cookie")) {
    const { headers: nextHeaders } = await import("next/headers");
    const requestHeaders = await nextHeaders();
    const cookie = requestHeaders.get("cookie");

    if (cookie) {
      headers.set("cookie", cookie);
    }
  }

  return {
    ...init,
    headers,
    credentials: "include" as RequestCredentials,
  };
};

export async function adminFetch(path: string, init: RequestInit = {}) {
  return fetch(buildAdminUrl(path), await withServerCookies(init));
}

// A 401 here only ever means the `protect` middleware rejected the
// admin_token cookie (missing, invalid, or expired — see
// backend/src/middlewares/authMiddleware.js). The proxy only checks that the
// cookie *exists*, not that it's still valid, so a page can render before
// the first API call discovers the session is actually dead. Bounce to
// login from wherever that happens instead of leaving the page half-broken.
//
// Important: proxy.ts's own redirect-away-from-/login check also only
// checks cookie *existence* — if we just navigate to /login while the stale
// admin_token is still sitting in the browser, proxy.ts immediately bounces
// back to "/", which re-fetches everything, 401s again, and loops.
//
// This used to try to break that loop by awaiting a logout call (clears the
// httpOnly cookie server-side) before navigating. That's backwards: it made
// loop-breaking depend on a network request succeeding, and a network
// request is exactly the thing that's already failing. Instead, set a
// plain JS-writable marker cookie *synchronously* — no network involved,
// can't itself fail — and have proxy.ts trust that instead of the stale
// admin_token. The logout call still fires to actually clear admin_token
// server-side, but only as a best-effort cleanup, never as something the
// redirect waits on.
let redirectingToLogin = false;

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  if (redirectingToLogin) return;
  redirectingToLogin = true;

  const next = encodeURIComponent(window.location.pathname + window.location.search);

  document.cookie = "force_login=1; path=/; max-age=30; samesite=lax";

  adminFetch("/auth/admin/logout", { method: "POST" }).catch(() => {
    // best effort cleanup only — the force_login marker above is what
    // actually breaks the redirect loop, this just tidies up the real cookie
  });

  window.location.href = `/login?next=${next}`;
}

// Every lib/admin-*-api.ts module used to redefine this exact
// json-parse-then-throw-on-!ok logic. Centralized here alongside adminFetch
// since every caller pairs the two together.
export async function parseAdminResponse<T>(
  response: Response,
  fallbackMessage = "API request failed",
): Promise<T> {
  const payload = await response.json();
console.log("parseAdminResponse payload", response);
  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
    }
    throw new Error(payload.message || fallbackMessage);
  }

  return payload.data as T;
}
