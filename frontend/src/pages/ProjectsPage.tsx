import { useNavigate } from 'react-router-dom';
import ApiErrorBanner from '../components/ApiErrorBanner';
import DataTableCard, { type Column } from '../components/DataTableCard';
import Stats from '../components/Stats';
import StatusBadge from '../components/StatusBadge';
import YearFilter from '../components/YearFilter';
import type { Project, ProjectPageParams, ProjectsResponse } from '../types';
import { formatDate, formatNumber } from '../lib/format';
import { usePaginatedList } from '../lib/usePaginatedList';
import { useYearFilter } from '../lib/useYearFilter';
import {
  useGetDashboardSummaryQuery,
  useGetProjectsQuery,
} from '../services/gestaguaApi';

// tamanhos de página do seletor (o backend limita em 100)
const PAGE_SIZES = [15, 50, 100];

function startYear(project: Project): string {
  if (project.referenceYear) return String(project.referenceYear);
  const contractYear = project.contractIssueDate?.slice(0, 4);
  return contractYear && /^\d{4}$/.test(contractYear) ? contractYear : 'Não informado';
}

function formatArea(ha: number | null): string {
  return ha === null || ha === undefined ? 'Não informado' : `${formatNumber(ha)} ha`;
}

/** Célula de duas linhas: valor forte + contexto discreto embaixo. */
function TwoLineCell({ top, base }: { top: string; base: string | null }) {
  return (
    <div className="min-w-0">
      <div className="truncate">{top}</div>
      {base && <div className="truncate text-[12.5px] text-ink-soft">{base}</div>}
    </div>
  );
}

const COLUMNS: Column<Project>[] = [
  {
    header: 'Propriedade',
    tdClassName: 'max-w-[220px] font-medium text-ink',
    cell: (project) => (
      <TwoLineCell top={project.property.name || 'Sem nome'} base={project.property.community} />
    ),
  },
  { header: 'Situação', cell: (project) => <StatusBadge status={project.status} /> },
  {
    header: 'Nº Contrato',
    tdClassName: 'whitespace-nowrap font-semibold text-brand',
    cell: (project) => project.contract || 'Não informado',
  },
  {
    header: 'Emissão do Contrato',
    tdClassName: 'whitespace-nowrap text-ink-soft',
    cell: (project) => formatDate(project.contractIssueDate),
  },
  {
    header: 'Ano de Início',
    tdClassName: 'whitespace-nowrap text-ink-soft',
    hideBelow: 'md',
    cell: startYear,
  },
  {
    header: 'Etapa',
    tdClassName: 'max-w-[200px]',
    cell: (project) => (
      <TwoLineCell top={project.macroStage || 'Não informado'} base={project.stage} />
    ),
  },
  {
    header: 'Bacia Hidrográfica',
    tdClassName: 'max-w-[180px] truncate text-ink-soft',
    hideBelow: 'md',
    cell: (project) => project.watershed || 'Não informado',
  },
  {
    header: 'Área Total',
    tdClassName: 'whitespace-nowrap text-ink-soft',
    hideBelow: 'md',
    cell: (project) => formatArea(project.property.totalAreaHa),
  },
  {
    header: 'Nascentes',
    tdClassName: 'whitespace-nowrap text-ink-soft',
    hideBelow: 'md',
    cell: (project) => formatNumber(project.property.totalSprings),
  },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { year, setYear } = useYearFilter();
  const { data: dashboardData } = useGetDashboardSummaryQuery({ year });

  const list = usePaginatedList<ProjectsResponse, Project, ProjectPageParams>(
    useGetProjectsQuery,
    (params) => ({ ...params, status: 'em_execucao', year }),
    (response) => ({
      items: response.projects,
      pagination: response.pagination,
      dataSource: response.dataSource,
    }),
    PAGE_SIZES[0],
    String(year ?? ''),
  );

  function openDetails(project: Project) {
    navigate(`/projetos/${project.id}/informacoes`);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
            Consulta somente leitura · atualização diária
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-tight text-brand-deep">
            Projetos
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Consulta aos projetos em execução. Cancelados e arquivados não aparecem nesta lista.
          </p>
        </div>
        <YearFilter
          years={dashboardData?.filters?.availableYears ?? []}
          value={year}
          onChange={setYear}
        />
      </div>

      <Stats
        activeProjects={dashboardData?.summary.activeProjects ?? null}
        activeProperties={dashboardData?.summary.activeProperties ?? null}
        totalAreaHa={dashboardData?.summary.totalAreaHa ?? null}
      />

      {list.error && <ApiErrorBanner error={list.error} onRetry={list.reload} />}

      <DataTableCard
        title="Projetos ativos"
        placeholder="Busque um projeto"
        emptyMessage="Nenhum projeto encontrado com esse filtro."
        list={list}
        columns={COLUMNS}
        rowKey={(project) => project.id}
        pageSizes={PAGE_SIZES}
        onRowClick={openDetails}
      />

    </>
  );
}
