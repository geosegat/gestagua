import type { Pagination, Project } from './api';

export interface PageParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ProjectPageParams extends PageParams {
  status?: string;
}

export interface AllProjectsResponse {
  projects: Project[];
  dataSource: string;
}

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
  setItemsPerPage: (value: number) => void;
  goToPage: (page: number) => void;
  reload: () => void;
}

export interface QueryResult<TData> {
  currentData?: TData;
  isFetching: boolean;
  error?: unknown;
  refetch: () => unknown;
}
