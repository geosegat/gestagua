import ApiErrorBanner from '../components/ApiErrorBanner';
import DataTableCard, { type Column } from '../components/DataTableCard';
import type { Mobilization, MobilizationsResponse, PageParams } from '../types';
import { formatDateTime } from '../lib/format';
import { usePaginatedList } from '../lib/usePaginatedList';
import { useGetMobilizationsQuery } from '../services/gestaguaApi';

// tamanhos de página do seletor (o backend limita em 100)
const PAGE_SIZES = [15, 50, 100];

function locality(mobilization: Mobilization): string {
  return mobilization.locality || mobilization.city || 'Não informado';
}

const COLUMNS: Column<Mobilization>[] = [
  {
    header: 'Local',
    tdClassName: 'font-medium text-ink',
    cell: (mobilization) => mobilization.local,
  },
  {
    header: 'Data e hora',
    tdClassName: 'whitespace-nowrap text-ink-soft',
    cell: (mobilization) => formatDateTime(mobilization.plannedDate),
  },
  {
    header: 'Localidade',
    hideBelow: 'sm',
    cell: locality,
  },
  {
    header: 'Responsável',
    cell: (mobilization) => mobilization.responsible || 'Não informado',
  },
];

export default function MobilizationsPage() {
  const list = usePaginatedList<MobilizationsResponse, Mobilization, PageParams>(
    useGetMobilizationsQuery,
    (params) => params,
    (response) => ({
      items: response.mobilizations,
      pagination: response.pagination,
      dataSource: response.dataSource,
    }),
    PAGE_SIZES[0],
  );

  return (
    <>
      {list.error && <ApiErrorBanner error={list.error} onRetry={list.reload} />}

      <DataTableCard
        title="Mobilização"
        placeholder="Busque uma mobilização"
        emptyMessage="Nenhuma mobilização encontrada com esse filtro."
        list={list}
        columns={COLUMNS}
        rowKey={(mobilization) => mobilization.id}
        pageSizes={PAGE_SIZES}
      />
    </>
  );
}
