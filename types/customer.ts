// types/customer.ts
<<<<<<< HEAD
=======
export type UILocation = {
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  country?: string | null;
};

>>>>>>> frontend-ready-vercel-v2
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
<<<<<<< HEAD
=======
  location?: UILocation | null;
>>>>>>> frontend-ready-vercel-v2
  healthProfile?: UIHealthProfile | null
};

// v3 backend -> UI mapper (adjust field names if your API differs)
export function toUICustomer(src: any): UICustomer {
  return {
    id: String(src.id ?? src.customer_id),
    name: src.name ?? src.fullName ?? [src.firstName, src.lastName].filter(Boolean).join(" ") ?? "",
    email: src.email ?? "",
    phone: src.phone ?? src.phone_number ?? undefined,
    status: (src.status === "archived" || src.is_deleted) ? "archived" : "active",
    avatar: src.avatar ?? undefined,
    tags: src.tags ?? src.custom_tags ?? [],
    restrictions: {
      required: src.restrictions?.required ?? [],                // or derive strings like "No <Allergen>"
      preferred: src.restrictions?.preferred ?? [],
      allergens: src.avoid_allergens ?? src.restrictions?.allergens ?? [],
      conditions: src.conditions ?? src.restrictions?.conditions ?? [],
      notes: src.restrictions?.notes ?? src.notes ?? undefined,
    },
<<<<<<< HEAD
=======
    location: src.location ?? null,
>>>>>>> frontend-ready-vercel-v2
    updatedAt: src.updated_at ?? src.updatedAt,

    healthProfile: src.healthProfile? {
      customerId: src.healthProfile.customerId ?? src.healthProfile.customer_id,
      heightCm: src.healthProfile.heightCm ?? src.healthProfile.height_cm,
      weightKg: src.healthProfile.weightKg ?? src.healthProfile.weight_kg,
      age: src.healthProfile.age,
      gender: src.healthProfile.gender,
      activityLevel: src.healthProfile.activityLevel ?? src.healthProfile.activity_level,
      conditions: src.healthProfile.conditions ?? [],
      dietGoals: src.healthProfile.dietGoals ?? [],
      avoidAllergens: src.healthProfile.avoidAllergens ?? [],
      macroTargets: src.healthProfile.macroTargets,
      bmi: src.healthProfile.bmi,
      bmr: src.healthProfile.bmr,
      tdeeCached: src.healthProfile.tdeeCached ?? src.healthProfile.tdee_cached,
      derivedLimits: src.healthProfile.derivedLimits,
    }
  : null,
  };
}
