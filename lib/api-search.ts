import { apiFetch } from "@/lib/backend";

export type SearchSuggestionsResponse = {
  suggestions?: string[];
  entities_found?: unknown;
  fallback?: boolean;
};

export async function getSearchSuggestions(query: string): Promise<SearchSuggestionsResponse> {
  if (!query?.trim() || query.trim().length < 3) {
    return { suggestions: [], entities_found: null };
  }
  const res = await apiFetch(
    `/api/v1/search/suggestions?q=${encodeURIComponent(query.trim())}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { suggestions: [], entities_found: null, fallback: true };
  }
  return data as SearchSuggestionsResponse;
}

// --- Discovery / Landing page APIs ---

export async function getRecentSearches(): Promise<string[]> {
  try {
    const res = await apiFetch("/api/v1/search/recent");
    const data = await res.json().catch(() => ({ data: [] }));
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

export async function saveRecentSearch(query: string): Promise<void> {
  try {
    await apiFetch("/api/v1/search/recent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
  } catch {
    // fire-and-forget, ignore errors
  }
}

export type TrendingCategory = {
  id: string;
  code: string | null;
  label: string;
  description: string | null;
  product_count: number;
};

export async function getTrendingCategories(): Promise<TrendingCategory[]> {
  try {
    const res = await apiFetch("/api/v1/search/trending-categories");
    const data = await res.json().catch(() => ({ data: [] }));
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

export type PopularProduct = {
  id: string;
  name: string;
  category?: string;
  price?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
  status?: string;
  brand?: string | null;
};

export async function getPopularProducts(limit = 10): Promise<PopularProduct[]> {
  try {
    const res = await apiFetch(`/api/v1/search/popular-products?limit=${limit}`);
    const data = await res.json().catch(() => ({ data: [] }));
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

export type SuggestedVendor = {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  contactEmail: string | null;
};

export async function getSuggestedVendors(limit = 5): Promise<SuggestedVendor[]> {
  try {
    const res = await apiFetch(`/api/v1/search/suggested-vendors?limit=${limit}`);
    const data = await res.json().catch(() => ({ data: [] }));
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}
