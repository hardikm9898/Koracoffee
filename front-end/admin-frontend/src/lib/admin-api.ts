const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const buildAdminUrl = (path: string) => `${API_BASE_URL}${path}`;

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
