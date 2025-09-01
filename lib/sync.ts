// lib/sync.ts
"use client";
import { getJWT } from "@/lib/jwt";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

export async function syncSupabaseFromAppwrite() {
  try {
    const jwt = await getJWT();
    if (!jwt) throw new Error("No JWT (are you logged in?)");
    const res = await fetch(`${BASE}/onboard/self`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "X-Appwrite-JWT": jwt },
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) console.warn("onboard/self failed", await res.text());
  } catch (e) {
    console.warn("syncSupabaseFromAppwrite error", e);
  }
}
