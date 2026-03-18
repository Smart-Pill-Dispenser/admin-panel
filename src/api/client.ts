import { getAdminApiUrl } from "./config";
import type { ApiErrorBody } from "./types";

export type GetToken = () => string | null;
export type OnUnauthorized = () => void;

let getToken: GetToken = () => null;
let onUnauthorized: OnUnauthorized = () => {};

export function setAuthTokenGetter(fn: GetToken) {
  getToken = fn;
}

export function setOnUnauthorized(fn: OnUnauthorized) {
  onUnauthorized = fn;
}

export class AdminApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function parseErrorResponse(res: Response): Promise<ApiErrorBody> {
  const text = await res.text();
  try {
    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return { code: "UNKNOWN", message: text || res.statusText || "Request failed" };
  }
}

export async function adminFetch(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<Response> {
  const { skipAuth, ...init } = options;
  const url = getAdminApiUrl(path);
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && (init.body && typeof init.body === "string")) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const body = await parseErrorResponse(res);
    if (res.status === 401) onUnauthorized();
    throw new AdminApiError(
      body.code || "ERROR",
      body.message || res.statusText,
      res.status,
      body.fieldErrors
    );
  }

  return res;
}

/** GET JSON. Throws AdminApiError on non-2xx. */
export async function adminGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const search = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
      ).toString()
    : "";
  const url = path + (search ? `?${search}` : "");
  const res = await adminFetch(url, { method: "GET" });
  return res.json() as Promise<T>;
}

/** POST JSON. Throws AdminApiError on non-2xx. */
export async function adminPost<T>(path: string, body?: unknown, skipAuth = false): Promise<T> {
  const res = await adminFetch(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    skipAuth,
  });
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** PATCH JSON. Throws AdminApiError on non-2xx. */
export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await adminFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
