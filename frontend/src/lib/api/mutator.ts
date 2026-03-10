/**
 * Custom mutator for Orval-generated API clients.
 *
 * Orval calls this function for every request. It injects the Supabase JWT,
 * builds the URL with any query params, and handles multipart/form-data vs
 * JSON bodies automatically.
 *
 * Do not import this file directly — it is referenced only by Orval-generated
 * code in src/lib/api/generated/.
 */

import config from "../config";
import { supabase } from "../supabase";

export type RequestOptions = {
  url: string;
  method: string;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function customMutator<T>(options: RequestOptions): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Build URL — Orval already substitutes path params, we only append query params here.
  const url = new URL(`${config.api.baseUrl}${options.url}`);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const isFormData = options.data instanceof FormData;

  const response = await fetch(url.toString(), {
    method: options.method.toUpperCase(),
    headers: {
      // Let the browser set Content-Type for multipart so it includes the boundary.
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body:
      options.data !== undefined
        ? isFormData
          ? (options.data as FormData)
          : JSON.stringify(options.data)
        : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: `HTTP ${response.status}` }));
    throw error;
  }

  // 204 No Content — nothing to parse.
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
