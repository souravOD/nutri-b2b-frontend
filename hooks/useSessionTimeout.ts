"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/backend";

const LAST_ACTIVE_KEY = "session_last_active";
const SESSION_START_KEY = "session_start";
const SESSION_HISTORY_KEY = "session_history";
const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds
const MAX_HISTORY = 10;

export interface SessionRecord {
  start: number;
  end: number;
  durationMs: number;
}

/**
 * Returns the rolling session history stored in localStorage.
 * Safe to call server-side (returns []).
 */
export function getSessionHistory(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) ?? "[]") as SessionRecord[];
  } catch {
    return [];
  }
}

/**
 * Computes avg/last session duration from history.
 * Returns null fields when no data exists.
 */
export function getSessionStats(): { avgMs: number | null; lastMs: number | null } {
  const history = getSessionHistory();
  if (!history.length) return { avgMs: null, lastMs: null };
  const lastMs = history[history.length - 1].durationMs;
  const avgMs = Math.round(history.reduce((s, r) => s + r.durationMs, 0) / history.length);
  return { avgMs, lastMs };
}

function recordSessionEnd() {
  if (typeof window === "undefined") return;
  const start = parseInt(localStorage.getItem(SESSION_START_KEY) ?? "0", 10);
  if (!start) return;
  const end = Date.now();
  const durationMs = end - start;
  if (durationMs < 5_000) return; // ignore sub-5s blips
  try {
    const history = getSessionHistory();
    history.push({ start, end, durationMs });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
  } catch { /* storage full — ignore */ }
  localStorage.removeItem(SESSION_START_KEY);
}

/**
 * Client-side idle session timeout.
 *
 * Reads pref.session_timeout_enabled and pref.session_timeout_minutes from
 * system_settings. When enabled, tracks mouse/key/click/scroll activity in
 * localStorage and signs the user out after the configured idle period.
 *
 * Also logs session start/end to localStorage for session stats display.
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

  // Track user activity + session start/end
  useEffect(() => {
    if (!user) return;

    // Record session start if not already set
    if (!localStorage.getItem(SESSION_START_KEY)) {
      localStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    };

    // Initialise on mount
    updateActivity();

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    // Record session end on tab/window close
    const handleUnload = () => recordSessionEnd();
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      window.removeEventListener("beforeunload", handleUnload);
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
        recordSessionEnd();
        await signOut().catch(() => {});
        router.push("/login?reason=timeout");
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, signOut, router]);
}
