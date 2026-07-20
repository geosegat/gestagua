import ApiErrorBanner from '../components/ApiErrorBanner';
import DataTableCard, { type Column } from '../components/DataTableCard';
import type { PageParams, Program, ProgramsResponse } from '../types';
import { formatNumber } from '../lib/format';
import { usePaginatedList } from '../lib/usePaginatedList';
import { useGetProgramsQuery } from '../services/gestaguaApi';

const PAGE_SIZES = [10, 50, 100];

function formatDuration(duration: number | null): string {
  if (duration === null) return '—';
  return `${formatNumber(duration)} ${duration === 1 ? 'dia' : 'dias'}`;
}

function getSafeUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

const COLUMNS: Column<Program>[] = [
  {
    header: 'Nome',
    tdClassName: 'font-medium text-ink',
    cell: (program) => program.name,
  },
  {
    header: 'Nome Proponente',
    cell: (program) => {
      const url = getSafeUrl(program.proponentUrl);
      const name = program.proponentName || '—';

      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-brand underline decoration-accent underline-offset-2 hover:text-accent"
        >
          {name}
        </a>
      ) : (
        name
      );
    },
  },
  {
    header: 'Duração',
    tdClassName: 'whitespace-nowrap text-ink-soft',
    cell: (program) => formatDuration(program.duration),
  },
];

export default function ProgramsPage() {
  const list = usePaginatedList<ProgramsResponse, Program, PageParams>(
    useGetProgramsQuery,
    (params) => params,
    (response) => ({
      items: response.programs,
      pagination: response.pagination,
      dataSource: response.dataSource,
    }),
    PAGE_SIZES[0],
  );

  return (
    <>
      {list.error && <ApiErrorBanner error={list.error} onRetry={list.reload} />}

      <DataTableCard
        title="Programas"
        placeholder="Busque um programa"
        emptyMessage="Nenhum programa encontrado com esse filtro."
        list={list}
        columns={COLUMNS}
        rowKey={(program) => program.id}
        pageSizes={PAGE_SIZES}
      />
    </>
  );
}
