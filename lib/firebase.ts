"use client";
// ─── Firebase Client SDK ──────────────────────────────────────────────────────
// Initialises Firebase once and exposes helpers for push notification management.
// Safe to import in any client component or hook.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { apiFetch } from "@/lib/backend";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "",
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

let firebaseApp:        FirebaseApp | null                        = null;
let messagingInstance:  ReturnType<typeof getMessaging> | null    = null;

function initFirebase(): FirebaseApp | null {
  if (!firebaseConfig.apiKey) {
    console.warn("[firebase] No config — push notifications disabled");
    return null;
  }
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApps()[0];
  }
  return firebaseApp;
}

/** Request browser push permission and register the resulting FCM token with the backend. */
export async function requestNotificationPermission(): Promise<{
  token:   string | null;
  granted: boolean;
}> {
  if (!(await isSupported())) {
    console.warn("[firebase] Browser doesn't support push notifications");
    return { token: null, granted: false };
  }

  const app = initFirebase();
  if (!app) return { token: null, granted: false };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { token: null, granted: false };

    messagingInstance = getMessaging(app);
    const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY });

    if (token) {
      await apiFetch("/api/v1/notifications/register-token", {
        method: "POST",
        body:   JSON.stringify({ device_token: token, platform: "web" }),
      });
    }

    return { token, granted: true };
  } catch (err: any) {
    console.error("[firebase] Token error:", err.message);
    return { token: null, granted: false };
  }
}

/** Subscribe to foreground messages (tab visible). */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messagingInstance) {
    const app = initFirebase();
    if (!app) return;
    messagingInstance = getMessaging(app);
  }
  onMessage(messagingInstance, callback);
}

/** Unregister a token from the backend (call on logout or permission revoked). */
export async function unregisterToken(token: string): Promise<void> {
  try {
    await apiFetch("/api/v1/notifications/register-token", {
      method: "DELETE",
      body:   JSON.stringify({ device_token: token }),
    });
  } catch (err: any) {
    console.error("[firebase] Unregister error:", err.message);
  }
}
