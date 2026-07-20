import type { PaginationInput, PaginationResult } from '../types';

export function parsePagination(
  query: PaginationInput,
  defaultLimit = 20,
): PaginationResult {
  const page = Math.max(1, Number.parseInt(query.page ?? '', 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(query.limit ?? '', 10) || defaultLimit),
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}
