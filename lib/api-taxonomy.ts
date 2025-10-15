import { apiFetch } from "@/lib/backend";

async function getter(path: string) {
  const res = await apiFetch(path);
  const j = await res.json();
  return j?.data ?? [];
}

export const listDiets      = (top=10, all=false) => getter(`/taxonomy/diets?top=${top}${all?"&all=1":""}`);
export const listAllergens  = (top=10, all=false) => getter(`/taxonomy/allergens?top=${top}${all?"&all=1":""}`);
export const listConditions = (top=10, all=false) => getter(`/taxonomy/conditions?top=${top}${all?"&all=1":""}`);
