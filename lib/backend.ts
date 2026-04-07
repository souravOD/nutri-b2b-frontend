"use client";

import { getJWT, refreshJWT } from "@/lib/jwt";



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
  return path.startsWith("/") ? path : `/${path}`;
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

const RETRYABLE_5XX = new Set([500, 502, 503, 504]);
const SAFE_METHODS  = new Set(["GET", "HEAD", "OPTIONS"]);

/** Authenticated fetch that reuses a cached Appwrite JWT.
 *  - Retries transient 5xx errors (GET only) with exponential backoff: 300ms → 900ms.
 *  - If the backend returns 401, refreshes the JWT once and retries.
 */
export async function apiFetch(path: string, init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase();
  const maxRetries = SAFE_METHODS.has(method) ? 2 : 0;

  let res = await doFetch(path, init, false);

  // Exponential backoff for transient 5xx on safe methods
  for (let attempt = 0; attempt < maxRetries && RETRYABLE_5XX.has(res.status); attempt++) {
    await new Promise((r) => setTimeout(r, 300 * Math.pow(3, attempt)));
    res = await doFetch(path, init, false);
  }

  // Single JWT refresh on 401
  if (res.status === 401) {
    res = await doFetch(path, init, true);
  }

  return res; // caller handles non-2xx
}
