'use client';

import { buildQuery, QueryValue } from '@/libs/api/api.util.query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type FilterKind = 'string' | 'number' | 'boolean';

/**
 * Filters that live in the address (`?status=proposed&year=1405`), so a
 * refresh, the back button or a shared link keeps them. The schema says which
 * keys exist and how to read them; unknown or malformed values are ignored.
 *
 * Pages using it must sit under a `<Suspense>` (Next needs one for
 * `useSearchParams`).
 */
export function useUrlFilters<T extends object>(schema: { [K in keyof T]-?: FilterKind }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const [key, kind] of Object.entries(schema) as Array<[string, FilterKind]>) {
      const raw = params.get(key);
      if (raw === null || raw === '') continue;
      if (kind === 'number') {
        const n = Number(raw);
        if (Number.isFinite(n)) out[key] = n;
      } else if (kind === 'boolean') {
        if (raw === 'true') out[key] = true;
        else if (raw === 'false') out[key] = false;
      } else {
        out[key] = raw;
      }
    }
    return out as T;
    // The schema is a constant of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // So several updates in one tick build on each other.
  const latest = useRef(filters);
  latest.current = filters;

  const setFilters = useCallback(
    (next: T | ((prev: T) => T)) => {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(latest.current) : next;
      latest.current = value;
      const query = buildQuery(value as Record<string, QueryValue>);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return [filters, setFilters] as const;
}

/**
 * A search box for a URL filter: typing is instant and local, the address (and
 * so the request) follows after a pause. Follows the address back when
 * something else changes it, e.g. «clear filters».
 */
export function useDebouncedFilterText(value: string | undefined, apply: (text: string) => void, delay = 300) {
  const [text, setText] = useState(value ?? '');
  const pushed = useRef(value ?? '');

  useEffect(() => {
    if ((value ?? '') !== pushed.current) {
      pushed.current = value ?? '';
      setText(value ?? '');
    }
  }, [value]);

  useEffect(() => {
    if (text === pushed.current) return;
    const timer = setTimeout(() => {
      pushed.current = text;
      apply(text);
    }, delay);
    return () => clearTimeout(timer);
    // `apply` is rebuilt on every render; only the text should restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay]);

  return [text, setText] as const;
}
