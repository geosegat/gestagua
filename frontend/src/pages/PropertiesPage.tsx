import { MapPin } from '../icons';
import { useNavigate } from 'react-router-dom';
import ApiErrorBanner from '../components/ApiErrorBanner';
import DataTableCard, { type Column } from '../components/DataTableCard';
import type { PageParams, PropertiesResponse, Property } from '../types';
import { formatNumber } from '../lib/format';
import { usePaginatedList } from '../lib/usePaginatedList';
import { useGetPropertiesQuery } from '../services/gestaguaApi';

/** CAR da propriedade: código do imóvel, com o registro ambiental de reserva. */
function carOf(property: Property): string | null {
  return property.propertyCode ?? property.ruralEnvironmentalRegistry ?? null;
}

// tamanhos de página do seletor (o backend limita em 100)
const PAGE_SIZES = [15, 50, 100];

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
    header: 'Código do imóvel (CAR)',
    tdClassName: 'max-w-[300px]',
    cell: (property) => {
      const car = carOf(property)?.trim();
      if (!car) return 'Não informado';

      // sem link próprio: o clique sobe pra linha, que leva ao mapa focado nesta
      // propriedade (ver onRowClick). O ícone de pino sinaliza "ver no mapa".
      return (
        <span
          title="Ver no mapa"
          className="inline-flex max-w-full items-center gap-1.5 font-semibold text-brand underline decoration-accent/60 underline-offset-2"
        >
          <MapPin size={13} className="shrink-0 text-accent" aria-hidden="true" />
          <span className="truncate">{car}</span>
        </span>
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
  const navigate = useNavigate();
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

  // clicar numa propriedade abre o mapa já focado no CAR dela; sem CAR, vai pro
  // mapa geral (não há geometria pra localizar)
  function openOnMap(property: Property) {
    const car = carOf(property);
    navigate(car ? `/mapa?car=${encodeURIComponent(car)}` : '/mapa');
  }

  return (
    <>
      {list.error && <ApiErrorBanner error={list.error} onRetry={list.reload} />}

      <DataTableCard
        title="Propriedades"
        placeholder="Busque por propriedade, produtor ou código do imóvel"
        emptyMessage="Nenhuma propriedade encontrada com esse filtro."
        list={list}
        columns={COLUMNS}
        rowKey={(property) => property.id}
        pageSizes={PAGE_SIZES}
        onRowClick={openOnMap}
      />
    </>
  );
}
