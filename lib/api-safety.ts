import { apiFetch } from "@/lib/backend";

export type SafetyCheckResponse = {
  conflicts?: unknown[];
  summary?: string;
  fallback?: boolean;
};

export async function runSafetyCheck(opts: {
  product_ids?: string[];
  customer_ids?: string[];
}): Promise<SafetyCheckResponse> {
  const res = await apiFetch("/api/v1/safety-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_ids: opts.product_ids ?? [],
      customer_ids: opts.customer_ids ?? [],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Safety check failed (${res.status})`);
  }
  return data as SafetyCheckResponse;
}
