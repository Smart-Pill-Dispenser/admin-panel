import { getAdminApiUrl } from "./config";
import type { ApiErrorBody } from "./types";

export type GetToken = () => string | null;
export type OnUnauthorized = () => void;

let getToken: GetToken = () => null;
let onUnauthorized: OnUnauthorized = () => {};

const USER_KEY = "admin_user";
const REFRESH_KEY = "admin_refresh_token";

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

function jwtExpSeconds(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const payload = JSON.parse(atob(b64 + pad)) as { exp?: unknown };
    if (typeof payload.exp === "number") return payload.exp;
    return null;
  } catch {
    return null;
  }
}

/** If the access token expires within [skewSec]s and a refresh token exists, refresh once. */
export async function adminEnsureFreshAccessToken(skewSec = 120): Promise<void> {
  const token = localStorage.getItem("admin_access_token");
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!token || !refreshToken || !getStoredEmail()) return;
  const exp = jwtExpSeconds(token);
  if (exp == null) return;
  const now = Math.floor(Date.now() / 1000);
  if (exp > now + skewSec) return;
  const next = await tryRefreshSession();
  if (!next && exp <= now) {
    localStorage.removeItem("admin_access_token");
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

function getStoredEmail(): string | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: unknown };
    return typeof parsed.email === "string" && parsed.email.trim() ? parsed.email : null;
  } catch {
    return null;
  }
}

async function tryRefreshSession(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const email = getStoredEmail();
  if (!refreshToken || !email) return null;

  const url = getAdminApiUrl("admin/refresh");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, refreshToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { idToken?: string; accessToken?: string; refreshToken?: string };
  const token = data.idToken ?? data.accessToken ?? null;
  if (token) localStorage.setItem("admin_access_token", token);
  if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
  return token;
}

export async function adminFetch(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<Response> {
  const { skipAuth, ...init } = options;
  const url = getAdminApiUrl(path);
  const headers = new Headers(init.headers);
  const alreadyRetried = headers.get("X-Admin-Retry") === "1";

  if (!headers.has("Content-Type") && (init.body && typeof init.body === "string")) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const isAuthExpired = res.status === 401 || res.status === 403;
    if (isAuthExpired && !skipAuth && !alreadyRetried) {
      const newToken = await tryRefreshSession();
      if (newToken) {
        const retryHeaders = new Headers(headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        retryHeaders.set("X-Admin-Retry", "1");
        const retryRes = await fetch(url, { ...init, headers: retryHeaders });
        if (retryRes.ok) return retryRes;
      }
    }

    const body = await parseErrorResponse(res);
    if (res.status === 401 || res.status === 403) onUnauthorized();
    throw new AdminApiError(body.code || "ERROR", body.message || res.statusText, res.status, body.fieldErrors);
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

/** DELETE. Throws AdminApiError on non-2xx. */
export async function adminDelete<T>(path: string): Promise<T> {
  const res = await adminFetch(path, { method: "DELETE" });
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
