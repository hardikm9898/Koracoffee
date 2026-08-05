export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

// Every lib/*.ts API module used to redefine API_BASE_URL and re-implement
// this exact json-parse-then-throw-on-!ok logic (with a per-file fallback
// message). Centralized here so there's one place to change the response
// envelope handling.
export async function parseApiResponse<T>(
  response: Response,
  fallbackMessage = "API request failed",
): Promise<T> {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || fallbackMessage);
  }

  return payload.data as T;
}
