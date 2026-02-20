"use client";

import { apiFetch } from "@/lib/backend";

export type ProvisioningCode =
  | "vendor_not_provisioned"
  | "vendor_team_mismatch"
  | "user_not_linked"
  | "identity_conflict"
  | "invalid_token"
  | "onboarding_failed"
  | "backend_unreachable"
  | "unknown";

export type ProvisioningResult =
  | { ok: true }
  | { ok: false; code: ProvisioningCode; message: string };

let inFlight: Promise<ProvisioningResult> | null = null;
let lastSuccessAt = 0;
const SUCCESS_COOLDOWN_MS = 30_000;

function asError(code: ProvisioningCode, message: string): ProvisioningResult {
  return { ok: false, code, message };
}

async function parseErrorResponse(res: Response): Promise<ProvisioningResult> {
  const payload = await res.json().catch(() => ({} as any));
  const code = String(payload?.code || "");
  const message = String(payload?.message || payload?.detail || `${res.status} ${res.statusText}`);

  if (code === "vendor_not_provisioned") return asError("vendor_not_provisioned", message);
  if (code === "vendor_team_mismatch") return asError("vendor_team_mismatch", message);
  if (code === "user_not_linked") return asError("user_not_linked", message);
  if (code === "identity_conflict") return asError("identity_conflict", message);
  if (code === "invalid_token") return asError("invalid_token", message);
  if (code === "onboarding_failed") return asError("onboarding_failed", message);

  return asError("unknown", message);
}

export async function syncSupabaseFromAppwrite(force = false): Promise<ProvisioningResult> {
  const now = Date.now();
  if (!force && now - lastSuccessAt < SUCCESS_COOLDOWN_MS) {
    return { ok: true };
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const res = await apiFetch("/onboard/self", {
        method: "POST",
      });

      if (res.ok) {
        lastSuccessAt = Date.now();
        return { ok: true } as const;
      }

      const parsed = await parseErrorResponse(res);
      console.warn(`[sync] onboard/self blocked (${parsed.code}): ${parsed.message}`);
      return parsed;
    } catch (e) {
      console.warn("syncSupabaseFromAppwrite error", e);
      return asError("backend_unreachable", "Unable to reach backend onboarding API.");
    }
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export async function verifySupabaseProvisioning(): Promise<ProvisioningResult> {
  try {
    const res = await apiFetch("/metrics");
    if (res.ok) return { ok: true };
    const parsed = await parseErrorResponse(res);
    return parsed;
  } catch (e) {
    console.warn("verifySupabaseProvisioning error", e);
    return asError("backend_unreachable", "Unable to verify Supabase provisioning from backend.");
  }
}
