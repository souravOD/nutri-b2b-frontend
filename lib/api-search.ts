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
