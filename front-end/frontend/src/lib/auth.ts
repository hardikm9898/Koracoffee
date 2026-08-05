export const AUTH_STORAGE_KEY = "aura_auth_session";
export const GUEST_SESSION_STORAGE_KEY = "aura_guest_session_id";

export type AuthUser = {
  id: string;
  name: string;
  phoneNumber: string;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  addresses?: {
    id: string;
    label: string;
    name: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    isDefault: boolean;
  }[];
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
const SESSION_VALIDATION_WINDOW_MS = 60 * 1000;

let lastValidatedToken = "";
let lastValidatedAt = 0;

const dispatchAuthChange = () => {
  window.dispatchEvent(new Event("auth-changed"));
};

const createSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const storeSession = (session: AuthSession) => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  dispatchAuthChange();
};

export const getGuestSessionId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const sessionId = createSessionId();
  window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, sessionId);
  return sessionId;
};

export const resetGuestSessionId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const sessionId = createSessionId();
  window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, sessionId);
  return sessionId;
};

export const getAuthToken = () => getStoredSession()?.token || "";

export const getSessionUser = () => getStoredSession()?.user || null;

export const getVerifiedAuthToken = async () => {
  const session = getStoredSession();
  const token = session?.token || "";

  if (!token) {
    return "";
  }

  const now = Date.now();
  if (
    token === lastValidatedToken &&
    now - lastValidatedAt < SESSION_VALIDATION_WINDOW_MS
  ) {
    return token;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      lastValidatedToken = token;
      lastValidatedAt = now;
      return token;
    }

    if (response.status === 401) {
      clearSession({ resetGuestSession: false });
      lastValidatedToken = "";
      lastValidatedAt = 0;
      return "";
    }

    return token;
  } catch {
    return token;
  }
};

export const clearSession = (options?: { resetGuestSession?: boolean }) => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  lastValidatedToken = "";
  lastValidatedAt = 0;

  if (options?.resetGuestSession) {
    resetGuestSessionId();
  }

  dispatchAuthChange();
};
