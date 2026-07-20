import ApiErrorBanner from '../components/ApiErrorBanner';
import DataTableCard, { type Column } from '../components/DataTableCard';
import type { PageParams, PropertiesResponse, Property } from '../types';
import { formatNumber } from '../lib/format';
import { usePaginatedList } from '../lib/usePaginatedList';
import { useGetPropertiesQuery } from '../services/gestaguaApi';

// tamanhos de página do seletor (o backend limita em 100)
const PAGE_SIZES = [15, 50, 100];

function city(property: Property): string {
  const { municipality, state } = property.location;
  if (municipality && state) return `${municipality}/${state}`;
  return municipality || state || '—';
}

function formatArea(ha: number | null): string {
  return ha === null || ha === undefined ? '—' : `${Number(ha).toLocaleString('pt-BR')} ha`;
}

const COLUMNS: Column<Property>[] = [
  {
    header: 'Propriedade',
    tdClassName: 'font-medium text-ink',
    cell: (property) => property.name || 'Sem nome',
  },
  {
    header: 'Produtor',
    tdClassName: 'text-ink-soft',
    cell: (property) => property.producer || '—',
  },
  { header: 'Cidade', cell: city },
  {
    header: 'Área Total',
    tdClassName: 'whitespace-nowrap text-ink-soft',
    cell: (property) => formatArea(property.totalAreaHa),
  },
  {
    header: 'Projetos',
    tdClassName: 'whitespace-nowrap font-semibold text-brand',
    cell: (property) => formatNumber(property.totalProjects),
  },
];

export default function PropertiesPage() {
  const list = usePaginatedList<PropertiesResponse, Property, PageParams>(
    useGetPropertiesQuery,
    (params) => params,
    (response) => ({
      items: response.properties,
      pagination: response.pagination,
      dataSource: response.dataSource,
    }),
    PAGE_SIZES[0],
  );

  return (
    <>
      {list.error && <ApiErrorBanner error={list.error} onRetry={list.reload} />}

      <DataTableCard
        title="Propriedades"
        placeholder="Busque uma propriedade"
        emptyMessage="Nenhuma propriedade encontrada com esse filtro."
        list={list}
        columns={COLUMNS}
        rowKey={(property) => property.id}
        pageSizes={PAGE_SIZES}
      />
    </>
  );
}
