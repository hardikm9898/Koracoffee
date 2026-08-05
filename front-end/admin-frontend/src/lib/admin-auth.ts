const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export type AdminSessionUser = {
  id: string;
  name: string;
  phoneNumber: string;
  isVerified: boolean;
  isAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type RequestOtpResponse = {
  phoneNumber: string;
  expiresAt: string;
  otp?: string;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
};

export async function requestAdminOtp(
  phoneNumber: string,
  name?: string,
): Promise<RequestOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/request-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      phoneNumber,
      ...(name ? { name } : {}),
    }),
  });

  return parseResponse<RequestOtpResponse>(response);
}

export async function verifyAdminOtp(
  phoneNumber: string,
  otp: string,
): Promise<AdminSessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      phoneNumber,
      otp,
    }),
  });

  const payload = await parseResponse<{
    user: AdminSessionUser;
    token?: string;
  }>(response);

  // If token is returned in response body (fallback for cross-origin cookie issues),
  // store it in localStorage as backup AND set a cookie for server-side access
  if (payload.token) {
    try {
      localStorage.setItem("admin_token", payload.token);

      // Also set a cookie so the server-side proxy can read it
      // This cookie is accessible to the server for authentication checks
      document.cookie = `admin_token=${payload.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    } catch {
      // localStorage might be unavailable (private browsing, etc.)
    }
  }

  return payload.user;
}

// Helper function to get stored admin token
export function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("admin_token");
  } catch {
    return null;
  }
}

export async function logoutAdmin(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/logout`, {
    method: "POST",
    credentials: "include",
  });

  await parseResponse(response);

  // Clear localStorage token as well
  try {
    localStorage.removeItem("admin_token");
  } catch {
    // Ignore errors
  }
}

export async function getCurrentAdmin(): Promise<AdminSessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/me`, {
    credentials: "include",
    cache: "no-store",
  });

  return parseResponse<AdminSessionUser>(response);
}
