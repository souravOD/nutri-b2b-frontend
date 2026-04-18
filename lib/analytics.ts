/**
 * Centralized feature-adoption event tracking.
 *
 * Fires events to:
 *   1. GA4 via window.gtag          (when configured via BrandingApplicator)
 *   2. Mixpanel via window.mixpanel (when configured via BrandingApplicator)
 *   3. Local localStorage log       (always — powers the Feature Adoption dashboard)
 *
 * Architecture decision: ALL tracking calls go through this file.
 * Never call window.gtag() or window.mixpanel.track() directly in page components.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    mixpanel?: {
      track: (event: string, props?: Record<string, unknown>) => void;
      identify: (userId: string) => void;
      people: {
        set: (props: Record<string, unknown>) => void;
      };
    };
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
 * Sends to GA4 + Mixpanel (when configured) and writes to the local event log.
 * Status is "terminated" if both providers throw, "success" otherwise.
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  let status: "success" | "terminated" = "success";

  if (typeof window === "undefined") return;

  // GA4
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params ?? {});
    }
  } catch {
    status = "terminated";
  }

  // Mixpanel
  try {
    if (typeof window.mixpanel?.track === "function") {
      window.mixpanel.track(name, params ?? {});
    }
  } catch {
    status = "terminated";
  }

  // Always log — even terminated events are recorded
  appendToLog({ name, params: params ?? {}, ts: Date.now(), status });
}

/**
 * Identify the authenticated user in Mixpanel.
 * Call this once after a successful login / session restore.
 * No-op if Mixpanel is not configured.
 *
 * @param userId   The B2B user's stable ID (e.g. Appwrite user ID)
 */
export function identifyUser(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.mixpanel?.identify(userId);
  } catch {
    // non-critical
  }
}

/**
 * Set persistent user profile properties in Mixpanel.
 * Call this after identify() — typically on login or whenever profile data loads.
 * No-op if Mixpanel is not configured.
 *
 * Suggested properties to pass:
 *   { $email, $name, plan, role, vendor_id, household_size }
 */
export function setUserProperties(props: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.mixpanel?.people.set(props);
  } catch {
    // non-critical
  }
}
