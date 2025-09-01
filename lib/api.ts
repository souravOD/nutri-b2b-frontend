// lib/api.ts — thin alias, no new logic
export { apiFetch } from "@/lib/backend";

// Optional convenience: JSON helper that uses the same apiFetch
import { apiFetch as _apiFetch } from "@/lib/backend";
export async function apiJSON<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await _apiFetch(path, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
