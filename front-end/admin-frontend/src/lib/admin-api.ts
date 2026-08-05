const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const buildAdminUrl = (path: string) => `${API_BASE_URL}${path}`;

// Get token from localStorage as fallback for when cookies aren't sent
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("admin_token");
  } catch {
    return null;
  }
}

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

  // Add Authorization header as fallback for cookie-based auth
  const token = getAuthToken();
  if (token) {
    // Set Authorization header
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    // Also set custom header for middleware to check
    if (!headers.has("x-admin-token")) {
      headers.set("x-admin-token", token);
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
