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

  // The backend already set an httpOnly `admin_token` cookie on this
  // response (credentials: "include" above ensures the browser stores it).
  // That cookie is the *only* place the token lives — it is intentionally
  // never read or written from JS. (This used to also duplicate the token
  // into localStorage and a second, JS-writable cookie, which meant any XSS
  // on this dashboard could exfiltrate the highest-privilege token in the
  // system through two extra channels. Do not reintroduce that.)
  const payload = await parseResponse<{
    user: AdminSessionUser;
    token?: string;
  }>(response);

  return payload.user;
}

export async function logoutAdmin(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/logout`, {
    method: "POST",
    credentials: "include",
  });

  await parseResponse(response);
  // Backend clears the httpOnly admin_token cookie via Set-Cookie on this
  // response — nothing for the client to clean up locally anymore.
}

export async function getCurrentAdmin(): Promise<AdminSessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/me`, {
    credentials: "include",
    cache: "no-store",
  });

  return parseResponse<AdminSessionUser>(response);
}
