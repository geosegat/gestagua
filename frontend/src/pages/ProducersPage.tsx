import ApiErrorBanner from "../components/ApiErrorBanner";
import DataTableCard, { type Column } from "../components/DataTableCard";
import { getProducers, type Producer } from "../lib/api";
import { formatNumber } from "../lib/format";
import { usePaginatedList } from "../lib/usePaginatedList";

// tamanhos de página do seletor (o backend limita em 100)
const PAGE_SIZES = [15, 50, 100];

const COLUMNS: Column<Producer>[] = [
  {
    header: "Nome",
    tdClassName: "font-medium text-ink",
    cell: (producer) => producer.name || "Sem nome",
  },
  {
    header: "Comunidade",
    tdClassName: "text-ink-soft",
    hideBelow: "sm",
    cell: (producer) => producer.community || "—",
  },
  {
    header: "Ocupação",
    hideBelow: "md",
    cell: (producer) => producer.occupation || "—",
  },
  {
    header: "Propriedades",
    tdClassName: "whitespace-nowrap font-semibold text-brand",
    cell: (producer) => formatNumber(producer.totalProperties),
  },
];

export default function ProducersPage() {
  const list = usePaginatedList<Producer>(async (params) => {
    const response = await getProducers(params);
    return {
      items: response.producers,
      pagination: response.pagination,
      dataSource: response.dataSource,
    };
  }, PAGE_SIZES[0]);

  return (
    <>
      {list.error && (
        <ApiErrorBanner error={list.error} onRetry={list.reload} />
      )}

      <DataTableCard
        title="Produtores"
        placeholder="Busque um produtor"
        emptyMessage="Nenhum produtor encontrado com esse filtro."
        list={list}
        columns={COLUMNS}
        rowKey={(producer) => producer.id}
        pageSizes={PAGE_SIZES}
      />
    </>
  );
}
