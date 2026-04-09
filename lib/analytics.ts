/**
 * Feature-adoption event tracking.
 * - Fires events to GA4 via window.gtag (when configured)
 * - Also stores a rolling local log in localStorage for the Feature Adoption dashboard
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const EVENTS_LOG_KEY = "feature_events_log";
const MAX_LOG = 200;

export interface FeatureEvent {
  name: string;
  params: Record<string, unknown>;
  ts: number; // Unix ms
  status: "success" | "terminated";
}

function appendToLog(event: FeatureEvent): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(EVENTS_LOG_KEY);
    const log: FeatureEvent[] = raw ? (JSON.parse(raw) as FeatureEvent[]) : [];
    log.push(event);
    if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
    localStorage.setItem(EVENTS_LOG_KEY, JSON.stringify(log));
  } catch {
    // storage full or parse error — ignore
  }
}

/**
 * Returns the rolling feature event log from localStorage.
 * Safe to call server-side (returns []).
 */
export function getFeatureEvents(): FeatureEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(EVENTS_LOG_KEY) ?? "[]") as FeatureEvent[];
  } catch {
    return [];
  }
}

/**
 * Fire a feature-adoption event.
 * Sends to GA4 if configured AND writes to the local event log.
 * Status is "terminated" if GA4 throws, "success" otherwise.
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  let status: "success" | "terminated" = "success";
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params ?? {});
    }
  } catch {
    status = "terminated";
  }
  // Always log — even terminated events are recorded
  appendToLog({ name, params: params ?? {}, ts: Date.now(), status });
}
