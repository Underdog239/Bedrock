export class ApiResponseError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
    this.payload = payload;
  }
}

function requestLabel(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.pathname;
  return input.url;
}

function payloadMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const record = payload as Record<string, unknown>;
  const detail = record.error ?? record.message;
  return typeof detail === 'string' && detail.trim() ? detail.trim() : null;
}

/**
 * Calls an application API that is expected to return JSON.
 *
 * Reading the body as text first lets us report empty, HTML, and truncated
 * responses without leaking the browser's cryptic `Response.json()` syntax
 * error into the UI.
 */
export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const label = requestLabel(input);
  const rawBody = await response.text();

  if (!rawBody.trim()) {
    throw new ApiResponseError(
      `${label} returned an empty response (HTTP ${response.status}). The app server may be unavailable; retry the request.`,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ApiResponseError(
      `${label} returned an invalid JSON response (HTTP ${response.status}).`,
      response.status,
    );
  }

  if (!response.ok) {
    throw new ApiResponseError(
      payloadMessage(payload) || `${label} failed with HTTP ${response.status} ${response.statusText || 'Error'}.`,
      response.status,
      payload,
    );
  }

  return payload as T;
}
