/**
 * Admin API base URL. Set via env for staging/prod.
 * Staging: https://xhtfoujfu4.execute-api.us-east-1.amazonaws.com/staging
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "https://xhtfoujfu4.execute-api.us-east-1.amazonaws.com/staging";

export function getAdminApiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
