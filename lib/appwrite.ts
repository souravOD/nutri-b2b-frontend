"use client";

import { Client, Account, Databases, Storage, Functions, Teams, ID } from "appwrite";

// Accept either PROJECT or PROJECT_ID (your .env uses _PROJECT_ID)
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const project =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

if (process.env.NODE_ENV !== "production") {
  if (!endpoint) console.error("[appwrite] Missing NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!project)  console.error("[appwrite] Missing NEXT_PUBLIC_APPWRITE_PROJECT or NEXT_PUBLIC_APPWRITE_PROJECT_ID");
}

export const client    = new Client().setEndpoint(endpoint).setProject(project);
export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);
export const functions = new Functions(client);

// ✅ NEW: export a Teams client
export const teams = new Teams(client);

// ✅ NEW: re-export ID so callers can do `import { ID } from "@/lib/appwrite"`
export { ID };

let cache: { jwt: string; expMs: number } | null = null;

export async function getAppwriteJWT(force = false): Promise<string | null> {
  const now = Date.now();
  if (!force && cache && now < cache.expMs) return cache.jwt;
  try {
    const { jwt } = await account.createJWT();
    // decode exp (seconds)
    const payload = JSON.parse(atob(jwt.split(".")[1] || ""));
    const expMs = (payload?.exp ? payload.exp * 1000 : now + 15 * 60 * 1000) - 60_000; // renew 1m early
    cache = { jwt, expMs };
    return jwt;
  } catch {
    cache = null;
    return null;
  }
}

// expose the real network call for the JWT cache
export const __createJWT_network = account.createJWT.bind(account);

// guard: any stray direct createJWT() calls won't hit the network
(account as any).createJWT = async function patchedCreateJWT() {
  try {
    const raw = localStorage.getItem("appwrite_jwt");
    if (raw) {
      const o = JSON.parse(raw);
      if (o?.token) return { jwt: o.token as string };
    }
  } catch {}
  return { jwt: "" };
};
