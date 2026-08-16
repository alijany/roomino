/**
 * Serialises a filter object into a query string.
 *
 * Every domain used to inline the same `URLSearchParams(...reduce)` block;
 * this is that block, once. Undefined, null and empty-string values are
 * dropped so `?page=0&status=` never reaches the API, and arrays are joined
 * with commas to match the backend's comma-separated query DTOs.
 */
export type QueryValue =
  | string
  | number
  | boolean
  | Array<string | number>
  | undefined
  | null;

export function buildQuery(filters?: Record<string, QueryValue>): string {
  if (!filters) return '';

  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return;
      params.set(key, value.join(','));
      return;
    }

    params.set(key, String(value));
  });

  return params.toString();
}

/** `buildQuery` with the leading `?`, ready to append to a path. */
export function withQuery(path: string, filters?: Record<string, QueryValue>): string {
  const query = buildQuery(filters);
  return query ? `${path}?${query}` : path;
}
