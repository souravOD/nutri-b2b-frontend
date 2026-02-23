/**
 * Normalize backend list responses that may return either:
 *   - A raw array:      [item, ...]
 *   - A wrapped object:  { data: [item, ...] }
 *   - An "items" shape:  { items: [item, ...] }
 *   - A "results" shape: { results: [item, ...] }
 *
 * Usage:
 *   const items = normalizeListResponse<Product>(json);
 */
export function normalizeListResponse<T = any>(
    data: T[] | { data?: T[]; items?: T[]; results?: T[] } | null | undefined
): T[] {
    if (data == null) return [];
    if (Array.isArray(data)) return data;
    return (data as any).data ?? (data as any).items ?? (data as any).results ?? [];
}
