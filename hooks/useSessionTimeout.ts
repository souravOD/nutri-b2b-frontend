"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/backend";

const LAST_ACTIVE_KEY = "session_last_active";
const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds

/**
 * Client-side idle session timeout.
 *
 * Reads pref.session_timeout_enabled and pref.session_timeout_minutes from
 * system_settings. When enabled, tracks mouse/key/click/scroll activity in
 * localStorage and signs the user out after the configured idle period.
 */
export function useSessionTimeout() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const configRef = useRef<{ enabled: boolean; minutes: number }>({ enabled: false, minutes: 60 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load settings once on mount (best-effort)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadConfig() {
      try {
        const [enabledRes, minutesRes] = await Promise.allSettled([
          apiFetch("/api/v1/settings/pref.session_timeout_enabled"),
          apiFetch("/api/v1/settings/pref.session_timeout_minutes"),
        ]);
        if (cancelled) return;
        let enabled = false;
        let minutes = 60;
        if (enabledRes.status === "fulfilled" && enabledRes.value.ok) {
          const j = await enabledRes.value.json().catch(() => ({}));
          enabled = j.value === "true" || j.value === true;
        }
        if (minutesRes.status === "fulfilled" && minutesRes.value.ok) {
          const j = await minutesRes.value.json().catch(() => ({}));
          const parsed = parseInt(String(j.value ?? ""), 10);
          if (!isNaN(parsed) && parsed > 0) minutes = parsed;
        }
        configRef.current = { enabled, minutes };
      } catch {
        // silently ignore; keep defaults
      }
    }
    loadConfig();
    return () => { cancelled = true; };
  }, [user]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    };

    // Initialise on mount
    updateActivity();

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
    };
  }, [user]);

  // Poll for idle timeout
  useEffect(() => {
    if (!user) return;

    intervalRef.current = setInterval(async () => {
      const { enabled, minutes } = configRef.current;
      if (!enabled) return;

      const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) ?? "0", 10);
      const idleMs = Date.now() - lastActive;
      const timeoutMs = minutes * 60 * 1000;

      if (idleMs >= timeoutMs) {
        clearInterval(intervalRef.current!);
        localStorage.removeItem(LAST_ACTIVE_KEY);
        await signOut().catch(() => {});
        router.push("/login?reason=timeout");
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, signOut, router]);
}
