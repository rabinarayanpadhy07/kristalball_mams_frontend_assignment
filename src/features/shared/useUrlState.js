import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Filter/pagination state stored in the URL query string, so views can be shared,
 * bookmarked and survive a refresh. Values equal to their default are omitted.
 * Changing any filter resets `page` to 1.
 */
export function useUrlState(defaults) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(() => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const raw = params.get(key);
      if (raw == null) continue;
      out[key] = typeof defaults[key] === 'number' ? Number(raw) || defaults[key] : raw;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const set = useCallback(
    (patch) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const touchesFilters = Object.keys(patch).some((k) => k !== 'page');
          const merged = { ...patch, ...(touchesFilters && !('page' in patch) ? { page: defaults.page } : {}) };
          for (const [key, value] of Object.entries(merged)) {
            if (value === undefined || value === null || value === '' || value === defaults[key]) next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );

  const reset = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  /** Filters (not page/pageSize) currently set away from their default. */
  const activeCount = Object.keys(defaults).filter(
    (k) => !['page', 'pageSize', 'open'].includes(k) && values[k] !== defaults[k] && values[k] !== '',
  ).length;

  return [values, set, { reset, activeCount }];
}
