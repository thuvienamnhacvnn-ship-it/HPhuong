"use client";

export class ApiError extends Error {
  constructor(public code: string, public status: number, public data: Record<string, unknown> = {}) {
    super(code);
  }
}

/** JSON fetch with uniform errors; network failures become code "offline". */
export async function api<T>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("offline", 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError((data as { error?: string }).error ?? "internal_error", response.status, data as Record<string, unknown>);
  return data as T;
}

export function errorText(errors: Record<string, string>, fallback: string, offline: string, error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "offline") return offline;
    return errors[error.code] ?? fallback;
  }
  return fallback;
}
