// client/src/lib/jwt.ts
"use client";
import { __createJWT_network } from "@/lib/appwrite";

/**
 * Centralized JWT cache with circuit breaker:
 *  - caches until ~90s before expiry
 *  - coalesces concurrent refreshes
 *  - shares token + cooldown across tabs (BroadcastChannel + localStorage)
 *  - after a 429, enter global cooldown (default 5 min) to stop hitting /jwts
 *  - ONLY this module is allowed to hit the real /jwts endpoint
 */

let token: string | null = null;
let expMs: number | null = null;
let inFlight: Promise<string | null> | null = null;

let cooldownUntil = 0; // epoch ms
const COOLDOWN_MS = 5 * 60_000; // 5 minutes
const SKEW_MS = 90_000;          // refresh 90s early

const now = () => Date.now();
const isFresh = () => !!token && !!expMs && now() + SKEW_MS < (expMs as number);
const inCooldown = () => now() < cooldownUntil;

function decodeExpMs(jwt: string): number | null {
  try {
    const payload = JSON.parse(
      atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/* -------- cross-tab sync -------- */
const CH = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("appwrite-jwt") : null;

function publishToken(jwt: string) {
  token = jwt;
  expMs = decodeExpMs(jwt) ?? now() + 15 * 60_000;
  try {
    localStorage.setItem("appwrite_jwt", JSON.stringify({ token: jwt, expMs }));
    CH?.postMessage({ kind: "token", token: jwt, expMs });
  } catch {}
}
function publishCooldown(until: number) {
  cooldownUntil = until;
  try {
    localStorage.setItem("appwrite_jwt_cooldown", String(until));
    CH?.postMessage({ kind: "cooldown", until });
  } catch {}
}

// bootstrap
(function boot() {
  try {
    const raw = localStorage.getItem("appwrite_jwt");
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj?.token && obj?.expMs) { token = obj.token; expMs = obj.expMs; }
    }
    const cd = Number(localStorage.getItem("appwrite_jwt_cooldown") || 0);
    if (Number.isFinite(cd)) cooldownUntil = cd;
  } catch {}
})();

CH?.addEventListener("message", (e: MessageEvent) => {
  const m = e.data || {};
  if (m.kind === "token" && typeof m.token === "string" && typeof m.expMs === "number") {
    token = m.token; expMs = m.expMs;
  } else if (m.kind === "cooldown" && typeof m.until === "number") {
    cooldownUntil = m.until;
  }
});

function is429(err: any): boolean {
  const code = (err && (err.code ?? err.status)) as number | undefined;
  if (code === 429) return true;
  const msg = String(err?.message || "");
  return /429|rate limit|too many/i.test(msg) || err?.type === "general_rate_limit_exceeded";
}

async function fetchNew(): Promise<string | null> {
  // Use the raw network function captured before the monkey patch.
  const { jwt } = await __createJWT_network();
  if (!jwt) return null;
  publishToken(jwt);
  return jwt;
}

export async function getJWT(): Promise<string | null> {
  if (isFresh()) return token;
  if (inCooldown()) return null;        // do not hit network during cooldown
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      return await fetchNew();
    } catch (err) {
      if (is429(err)) {
        publishCooldown(now() + COOLDOWN_MS);
        return null;
      }
      // soft cooldown for other errors to avoid thrash
      publishCooldown(now() + 30_000);
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export async function refreshJWT(): Promise<string | null> {
  // Explicit refresh is used after backend 401. It must bypass cooldown
  // so a newly valid Appwrite session can recover immediately.
  token = null;
  expMs = null;
  inFlight = null;
  publishCooldown(0);
  try {
    return await fetchNew();
  } catch (err) {
    if (is429(err)) {
      publishCooldown(now() + COOLDOWN_MS);
      return null;
    }
    publishCooldown(now() + 30_000);
    return null;
  }
}

export function clearJWT() {
  token = null; expMs = null; inFlight = null; cooldownUntil = 0;
  try {
    localStorage.removeItem("appwrite_jwt");
    localStorage.removeItem("appwrite_jwt_cooldown");
  } catch {}
  CH?.postMessage({ kind: "token", token: null, expMs: null });
  CH?.postMessage({ kind: "cooldown", until: 0 });
}
