import { ExternalLink } from '../icons';
import ApiErrorBanner from '../components/ApiErrorBanner';
import DataTableCard, { type Column } from '../components/DataTableCard';
import type { PageParams, PropertiesResponse, Property } from '../types';
import { formatNumber } from '../lib/format';
import { usePaginatedList } from '../lib/usePaginatedList';
import { useGetPropertiesQuery } from '../services/gestaguaApi';

// tamanhos de página do seletor (o backend limita em 100)
const PAGE_SIZES = [15, 50, 100];
const PUBLIC_CAR_URL = 'https://consulta.car.gov.br/';

function city(property: Property): string {
  const { municipality, state } = property.location;
  if (municipality && state) return `${municipality}/${state}`;
  return municipality || state || 'Não informado';
}

function formatArea(ha: number | null): string {
  return ha === null || ha === undefined
    ? 'Não informado'
    : `${Number(ha).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`;
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
    cell: (property) => property.producer || 'Não informado',
  },
  { header: 'Cidade', cell: city },
  {
    header: 'Área Total',
    tdClassName: 'whitespace-nowrap text-ink-soft',
    cell: (property) => formatArea(property.totalAreaHa),
  },
  {
    header: 'CAR',
    tdClassName: 'max-w-[230px]',
    cell: (property) => {
      const registry = property.ruralEnvironmentalRegistry?.trim();
      if (!registry) return 'Não informado';

      return (
        <a
          href={PUBLIC_CAR_URL}
          target="_blank"
          rel="noreferrer"
          title={`Abrir a Consulta Pública do CAR e buscar por ${registry}`}
          className="inline-flex max-w-full items-center gap-1.5 font-semibold text-brand underline decoration-accent/60 underline-offset-2 hover:text-accent"
        >
          <span className="truncate">{registry}</span>
          <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
        </a>
      );
    },
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
