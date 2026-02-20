'use client';

import { useQueryStates, parseAsString } from 'nuqs';

/**
 * Hook for managing render filter state in URL query params
 *
 * Uses nuqs for type-safe URL state persistence.
 * Filter/search changes reset cursor to empty string (go back to page 1).
 */
export function useRenderFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      status: parseAsString.withDefault('all'),
      search: parseAsString.withDefault(''),
      cursor: parseAsString.withDefault(''),
    },
    { history: 'replace' }
  );

  return {
    status: filters.status,
    search: filters.search,
    cursor: filters.cursor,
    setStatus: (status: string) => setFilters({ status, cursor: '' }),
    setSearch: (search: string) => setFilters({ search, cursor: '' }),
    setCursor: (cursor: string) => setFilters({ cursor }),
    clearFilters: () => setFilters({ status: 'all', search: '', cursor: '' }),
  };
}
