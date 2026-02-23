import { apiFetch } from "@/lib/backend";
import { UICustomer, toUICustomer } from "@/types/customer";
import { normalizeListResponse } from "@/lib/api-helpers";

export type CustomerLocation = {
  city?: string; state?: string; postal?: string; country?: string;
};

function normalizeTags(tags?: string[] | string) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") return tags.split(",").map(s => s.trim()).filter(Boolean);
  return undefined;
}

export async function listCustomers(): Promise<UICustomer[]> {
  const res = await apiFetch("/customers");
  const raw = await res.json();
  return normalizeListResponse(raw).map(toUICustomer);
}

export async function getCustomer(id: string) {
  const res = await apiFetch(`/customers/${encodeURIComponent(id)}`); // <-- backend route, no /api
  if (!res.ok) throw new Error(`Customer ${id} failed: ${res.status}`);

  const json = await res.json().catch(() => null);
  // Accept {data:[...]}, {items:[...]}, single object, or array
  const raw =
    Array.isArray(json) ? json[0] :
      (json?.data?.[0] ?? json?.items?.[0] ?? json);

  return toUICustomer(raw || {});
}

// Adjust this payload mapping to your backend contract if needed
export type CreateCustomerPayload = {
  name: string; email: string; phone?: string;
  status?: "active" | "archived";
  tags?: string[];
  restrictions?: {
    required?: string[]; preferred?: string[];
    allergens?: string[]; conditions?: string[]; notes?: string;
  };
};

export async function createCustomer(payload: {
  name: string; email: string; phone?: string;
  status?: "active" | "archived";
  tags?: string[];
}): Promise<UICustomer> {
  const body = {
    fullName: payload.name?.trim(),
    email: payload.email?.trim(),
    phone: payload.phone?.trim() || undefined,
    customTags: normalizeTags(payload.tags),
    status: payload.status,
  };
  const res = await apiFetch("/customers", { method: "POST", body: JSON.stringify(body) });
  // Surface backend errors instead of silently succeeding
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message || data.error)) || `Create failed (${res.status})`;
    throw new Error(String(msg));
  }
  return toUICustomer((data as any)?.data ?? data);
}

export async function updateCustomer(
  id: string,
  patch: { name?: string; email?: string; phone?: string; notes?: string; tags?: string[] | string; location?: CustomerLocation }
): Promise<UICustomer> {
  const body: any = {
    ...(patch.name ? { fullName: patch.name.trim() } : {}),
    ...(patch.email ? { email: patch.email.trim() } : {}),
    ...(patch.phone ? { phone: patch.phone.trim() } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  };
  const customTags = normalizeTags(patch.tags);
  if (customTags) body.customTags = customTags;

  if (patch.location) {
    body.location = {
      city: patch.location.city?.trim() || undefined,
      state: patch.location.state?.trim() || undefined,
      postal: patch.location.postal?.trim() || undefined,
      country: patch.location.country?.trim()?.toUpperCase() || undefined,
    };
  }

  const res = await apiFetch(`/customers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  return toUICustomer(raw?.data ?? raw);
}

export async function deleteCustomer(id: string) {
  const res = await apiFetch(`/customers/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Delete failed (${res.status})`);
  }
  return true;
}

export async function updateCustomerHealth(
  id: string,
  body: {
    heightCm?: number; weightKg?: number; age?: number; gender?: string;
    activityLevel?: string; conditions?: string[]; dietGoals?: string[];
    macroTargets?: { protein_g?: number; carbs_g?: number; fat_g?: number; calories?: number };
    avoidAllergens?: string[];
    // do NOT send derived fields
    bmi?: number; bmr?: number; tdeeCached?: number; derivedLimits?: any;
  }
) {
  const { bmi, bmr, tdeeCached, derivedLimits, ...safe } = body || {};
  const res = await apiFetch(`/customers/${encodeURIComponent(id)}/health`, {
    method: "PATCH",
    body: JSON.stringify(safe),
  });
  const raw = await res.json();
  return raw?.data ?? raw;
}

export async function createCustomerWithHealth(input: {
  // 🔽 accept both; form sends fullName
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  // 🔽 accept both; form sends customTags
  customTags?: string[] | string;
  tags?: string[] | string;
  health?: {
    age?: number;
    gender?: "male" | "female" | "other" | "unspecified";
    activityLevel?: "sedentary" | "light" | "moderate" | "very" | "extra";
    heightCm?: number;
    weightKg?: number;
    conditions?: string[];
    dietGoals?: string[];
    avoidAllergens?: string[];
    macroTargets?: { protein_g?: number; carbs_g?: number; fat_g?: number; calories?: number };
    // do NOT send derived fields
    bmi?: number; bmr?: number; tdeeCached?: number; derivedLimits?: Record<string, any>;
  };
}) {
  const payload: any = {
    // 🔽 prefer fullName; fallback to legacy name
    fullName: (input.fullName ?? input.name ?? "").trim(),
    email: input.email?.trim(),
    phone: input.phone?.trim() || undefined,
    // 🔽 prefer customTags; fallback to legacy tags
    customTags: normalizeTags(input.customTags ?? input.tags),
  };

  if (input.health) {
    const { bmi, bmr, tdeeCached, derivedLimits, ...safeHealth } = input.health;
    // backend will compute derived fields
    payload.health = safeHealth;
  }

  const res = await apiFetch("/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  // Respect HTTP status codes; raise clear error to UI
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message || data.error)) || `Create failed (${res.status})`;
    throw new Error(String(msg));
  }
  return (data as any)?.data ?? data;
}

// Customer-product notes
export async function getCustomerProductNote(customerId: string, productId: string): Promise<{ note: string | null }> {
  const res = await apiFetch(`/customers/${encodeURIComponent(customerId)}/products/${encodeURIComponent(productId)}/notes`);
  const data = await res.json().catch(() => ({} as any));
  return { note: (data?.note ?? null) as any };
}

export async function setCustomerProductNote(customerId: string, productId: string, note: string | null) {
  const res = await apiFetch(`/customers/${encodeURIComponent(customerId)}/products/${encodeURIComponent(productId)}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.detail || d?.message || `Save failed (${res.status})`);
  }
  return await res.json();
}
