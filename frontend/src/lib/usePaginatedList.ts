import { useEffect, useRef, useState } from 'react';
import type {
  PageData,
  PaginatedList,
  QueryResult,
} from '../types';
import { getApiErrorMessage } from './apiError';

const DEBOUNCE_MS = 350;

/**
 * Adapta uma query paginada do RTK Query ao contrato visual das tabelas.
 * Paginação e busca continuam locais; dados, cache, deduplicação e retry ficam
 * centralizados na API do Redux.
 */
export function usePaginatedList<TData, TItem, TArgs>(
  useQuery: (args: TArgs) => QueryResult<TData>,
  makeArgs: (params: { page: number; limit: number; search: string }) => TArgs,
  selectPage: (data: TData) => PageData<TItem>,
  initialLimit: number,
  filterKey = '',
): PaginatedList<TItem> {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const previousFilter = useRef(filterKey);
  if (previousFilter.current !== filterKey) {
    previousFilter.current = filterKey;
    if (page !== 1) setPage(1);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setAppliedSearch(search.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const query = useQuery(makeArgs({ page, limit: itemsPerPage, search: appliedSearch }));
  const selected = query.currentData ? selectPage(query.currentData) : null;
  const totalPages = selected?.pagination.totalPages || 1;

  function setItemsPerPage(value: number) {
    setItemsPerPageState(value);
    setPage(1);
  }

  return {
    items: selected?.items ?? [],
    total: selected?.pagination.total ?? 0,
    totalPages,
    dataSource: selected?.dataSource ?? null,
    loading: query.isFetching && !selected,
    error: query.error ? getApiErrorMessage(query.error) : null,
    page,
    itemsPerPage,
    search,
    setSearch,
    setItemsPerPage,
    goToPage: (nextPage) => setPage(Math.min(Math.max(1, nextPage), totalPages)),
    reload: () => {
      void query.refetch();
    },
  };
}
