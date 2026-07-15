import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, clearKey, type Pagination } from './api';

/** Formato que o hook espera de volta do fetcher, independente da rota. */
export interface PageData<T> {
  items: T[];
  pagination: Pagination;
  dataSource: string;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  totalPages: number;
  dataSource: string | null;
  loading: boolean;
  error: string | null;
  page: number;
  itemsPerPage: number;
  search: string;
  setSearch: (value: string) => void;
  setItemsPerPage: (n: number) => void;
  goToPage: (page: number) => void;
  reload: () => void;
}

const DEBOUNCE_MS = 350;

/**
 * Estado de uma listagem paginada do espelho: página, busca com debounce,
 * loading/erro e queda pro login em 401. Busca e paginação são resolvidas NO
 * BACKEND (params page/limit/busca) — o hook só carrega a página pedida.
 *
 * `filterKey` é a serialização dos filtros que a PÁGINA controla (ex.: status).
 * O hook não sabe o que ela significa: só recarrega e volta pra página 1 quando
 * muda, pra não pedir a página 3 de um resultado que encolheu.
 */
export function usePaginatedList<T>(
  fetchPage: (params: { page: number; limit: number; search: string }) => Promise<PageData<T>>,
  initialLimit: number,
  filterKey: string = '',
): PaginatedList<T> {
  const navigate = useNavigate();

  // o fetcher chega como arrow inline (nova a cada render). Guardar numa ref
  // evita refazer a request a cada render sem obrigar a página a memoizar.
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PageData<T> | null>(null);

  // Reset síncrono no render (e não num efeito): assim o loadPage() do ciclo já
  // enxerga page = 1. Num useEffect a página antiga seria buscada antes.
  const previousFilter = useRef(filterKey);
  if (previousFilter.current !== filterKey) {
    previousFilter.current = filterKey;
    setPage(1);
  }

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchRef.current({ page, limit: itemsPerPage, search: appliedSearch }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearKey();
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, appliedSearch, filterKey, navigate]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // ao digitar, volta pra página 1 e só então aplica o filtro no backend
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setAppliedSearch(search.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [search]);

  function setItemsPerPage(n: number) {
    setItemsPerPageState(n);
    setPage(1);
  }

  const totalPages = data?.pagination.totalPages || 1;

  return {
    items: data?.items ?? [],
    total: data?.pagination.total ?? 0,
    totalPages,
    dataSource: data?.dataSource ?? null,
    loading,
    error,
    page,
    itemsPerPage,
    search,
    setSearch,
    setItemsPerPage,
    goToPage: (nextPage) => setPage(Math.min(Math.max(1, nextPage), totalPages)),
    reload: loadPage,
  };
}
