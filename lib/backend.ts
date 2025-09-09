"use client";

import { getJWT, refreshJWT } from "@/lib/jwt";

// Use the same host you open in the browser (localhost vs 127.0.0.1)
const RAW_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// Normalize the backend origin (adds protocol if missing, strips trailing /)
function normalizeBase(raw?: string) {
  const s = (raw ?? "").trim();
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  return withProto.replace(/\/+$/, "");
}

// Use env or localhost (both normalized)
const BASE = normalizeBase(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000");

function normalizePath(path: string) {
  if (!path) return "/";
  let p = path.startsWith("/") ? path : `/${path}`;
  p = p.replace(/^\/api(?:\/v\d+)?(\/|$)/, "/"); // drop leading /api(/vX) if passed
  p = p.replace(/^\/v\d+(\/|$)/, "/");          // drop lone /vX if passed
  return p;
}

async function doFetch(path: string, init?: RequestInit, forceFresh = false) {
  const jwt = forceFresh ? await refreshJWT() : await getJWT();

  // NEW: allow absolute URLs, otherwise join with normalized BASE
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${BASE}${normalizePath(path)}`;

  const headers = new Headers(init?.headers || {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (jwt) {
    headers.set("Authorization", `Bearer ${jwt}`);
    headers.set("X-Appwrite-JWT", jwt);
  }

  return fetch(url, {
    ...init,
    headers,
    cache: init?.cache ?? "no-store",
    credentials: init?.credentials ?? "include",
  });
}

/** Authenticated fetch that reuses a cached Appwrite JWT.
 *  If the backend returns 401, refresh the JWT once and retry.
 */
export async function apiFetch(path: string, init?: RequestInit) {
  let res = await doFetch(path, init, false);
  if (res.status === 401) {
    res = await doFetch(path, init, true);
  }
  return res; // caller handles non-2xx
}
