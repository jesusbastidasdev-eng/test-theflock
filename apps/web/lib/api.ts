/** Use same-origin `/api` in the browser (rewritten to Fastify) so cookies work on localhost. */
function apiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
}

export type ApiError = { error: string; details?: unknown };

/** Path should start with /api */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = data as ApiError | null;
    throw new Error(err?.error ?? `Request failed: ${res.status}`);
  }
  return data as T;
}
