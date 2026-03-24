/**
 * Vite `base` without trailing slash (e.g. "" for `/`, or "/app" for `/app/`).
 * Use for same-origin API paths so dev proxy and subpath deploys stay consistent.
 */
export const APP_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function withAppBase(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE}${p}`;
}
