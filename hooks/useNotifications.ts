"use client";
// ─── useNotifications ────────────────────────────────────────────────────────
// Manages browser push notification permission and FCM token lifecycle.
// Exposes explicit requestPermission / revokePermission actions so the UI
// can surface a prompt at the right moment (e.g. settings page, post-login).
// Also sets up the foreground message listener automatically once granted.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import {
  requestNotificationPermission,
  onForegroundMessage,
  unregisterToken,
} from "@/lib/firebase";

interface NotificationState {
  permissionGranted: boolean | null;
  token:             string | null;
  loading:           boolean;
  error:             string | null;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    permissionGranted: null,
    token:             null,
    loading:           false,
    error:             null,
  });

  const requestPermission = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await requestNotificationPermission();
      setState({
        permissionGranted: result.granted,
        token:             result.token,
        loading:           false,
        error:             result.granted ? null : "Permission denied",
      });
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  const revokePermission = useCallback(async () => {
    if (!state.token) return;
    try {
      await unregisterToken(state.token);
      setState({ permissionGranted: false, token: null, loading: false, error: null });
    } catch (err: any) {
      setState((s) => ({ ...s, error: err.message }));
    }
  }, [state.token]);

  // Set up foreground message listener whenever permission is granted
  useEffect(() => {
    if (!state.permissionGranted) return;
    onForegroundMessage((payload) => {
      const title = payload.notification?.title ?? "NutriIntel B2B";
      const body  = payload.notification?.body  ?? "";
      // Browser already handles background notifications via the service worker.
      // For foreground: dispatch a custom DOM event so any toast/alert component
      // can pick it up without coupling this hook to a specific UI library.
      window.dispatchEvent(
        new CustomEvent("fcm-message", { detail: { title, body, data: payload.data } }),
      );
    });
  }, [state.permissionGranted]);

  return {
    ...state,
    requestPermission,
    revokePermission,
  };
}
