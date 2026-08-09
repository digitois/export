'use client';

export class ClientApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      (payload as { error?: string })?.error ??
      `Request failed with status ${res.status}`;
    throw new ClientApiError(message, res.status);
  }

  return payload as T;
}

/**
 * Fetch a route handler that responds with the standard `{ data }` envelope and
 * return the unwrapped payload directly. Most API responses in this app use that
 * shape (see `ok()` in `src/lib/api.ts`); this helper keeps call sites typed and
 * avoids the class of bug where a raw `{ data: T }` object is consumed as `T`.
 */
export async function apiData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await api<{ data: T }>(path, options);
  return data;
}

export function getSearchParamString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}
