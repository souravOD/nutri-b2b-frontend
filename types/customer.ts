// types/customer.ts
export type UIHealthProfile = {
  customerId: string
  heightCm?: number
  weightKg?: number
  age?: number
  gender?: string
  activityLevel?: string
  conditions?: string[]
  dietGoals?: string[]
  avoidAllergens?: string[]
  macroTargets?: {
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    calories?: number
  }
  bmi?: number
  bmr?: number
  tdeeCached?: number
  derivedLimits?: Record<string, any>
}


export type UICustomer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: "active" | "archived";
  avatar?: string;
  tags: string[];
  restrictions: {
    required: string[];
    preferred: string[];
    allergens: string[];
    conditions: string[];
    notes?: string;
  };
  updatedAt?: string;
  healthProfile?: UIHealthProfile | null
};

// v3 backend -> UI mapper (adjust field names if your API differs)
export function toUICustomer(src: any): UICustomer {
  const rawStatus = String(src.account_status ?? src.accountStatus ?? src.status ?? "").toLowerCase()
  const status: "active" | "archived" =
    rawStatus === "active" ? "active" : "archived"

  const rawActivity = String(src.healthProfile?.activityLevel ?? src.healthProfile?.activity_level ?? "").toLowerCase()
  const activityLevel =
    rawActivity === "lightly_active" ? "light" :
    rawActivity === "moderately_active" ? "moderate" :
    rawActivity === "very_active" ? "very" :
    rawActivity === "extra_active" ? "extra" :
    (rawActivity || undefined)

  return {
    id: String(src.id ?? src.customer_id),
    name: src.name ?? src.fullName ?? [src.firstName, src.lastName].filter(Boolean).join(" ") ?? "",
    email: src.email ?? "",
    phone: src.phone ?? src.phone_number ?? undefined,
    notes: src.notes ?? undefined,
    status: src.is_deleted ? "archived" : status,
    avatar: src.avatar ?? undefined,
    // Accept camelCase from backend as well as snake_case
    tags: src.tags ?? src.customTags ?? src.custom_tags ?? [],
    restrictions: {
      required: src.restrictions?.required ?? [],                // or derive strings like "No <Allergen>"
      preferred:
        src.restrictions?.preferred ??
        src.healthProfile?.dietGoals ??
        src.healthProfile?.diet_goals ??
        [],
      allergens:
        src.healthProfile?.avoidAllergens ??
        src.healthProfile?.avoid_allergens ??
        src.avoidAllergens ??
        src.avoid_allergens ??
        src.restrictions?.allergens ??
        [],
      conditions:
        src.healthProfile?.conditions ??
        src.conditions ??
        src.restrictions?.conditions ??
        [],
      notes: src.restrictions?.notes ?? src.notes ?? undefined,
    },
    updatedAt: src.updated_at ?? src.updatedAt,

    healthProfile: src.healthProfile ? {
      customerId: src.healthProfile.customerId ?? src.healthProfile.customer_id,
      heightCm: src.healthProfile.heightCm ?? src.healthProfile.height_cm,
      weightKg: src.healthProfile.weightKg ?? src.healthProfile.weight_kg,
      age: src.healthProfile.age,
      gender: src.healthProfile.gender,
      activityLevel,
      conditions: src.healthProfile.conditions ?? [],
      dietGoals: src.healthProfile.dietGoals ?? src.healthProfile.diet_goals ?? [],
      avoidAllergens: src.healthProfile.avoidAllergens ?? src.healthProfile.avoid_allergens ?? [],
      macroTargets: src.healthProfile.macroTargets ?? src.healthProfile.macro_targets,
      bmi: src.healthProfile.bmi,
      bmr: src.healthProfile.bmr,
      tdeeCached: src.healthProfile.tdeeCached ?? src.healthProfile.tdee_cached,
      derivedLimits: src.healthProfile.derivedLimits ?? src.healthProfile.derived_limits,
    } : null,
  };
}
