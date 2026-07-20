import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiErrorBanner from '../components/ApiErrorBanner';
import DataTableCard, { type Column } from '../components/DataTableCard';
import FilterChips, { type FilterOption } from '../components/FilterChips';
import Stats from '../components/Stats';
import StatusBadge from '../components/StatusBadge';
import type { Project, ProjectPageParams, ProjectsResponse } from '../types';
import { formatDate, formatNumber } from '../lib/format';
import { usePaginatedList } from '../lib/usePaginatedList';
import { useGetProjectsQuery } from '../services/gestaguaApi';

// tamanhos de página do seletor (o backend limita em 100)
const PAGE_SIZES = [15, 50, 100];

const STATUS_OPTIONS: FilterOption[] = [
  { value: '', label: 'Todos' },
  { value: 'em_execucao', label: 'Em execução' },
  { value: 'cancelado', label: 'Cancelados' },
  { value: 'arquivado', label: 'Arquivados' },
];

function startYear(project: Project): string {
  const year = project.contractIssueDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : '—';
}

function formatArea(ha: number | null): string {
  return ha === null || ha === undefined ? '—' : `${formatNumber(ha)} ha`;
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
    cell: (project) => project.contract || '—',
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
    cell: (project) => <TwoLineCell top={project.macroStage || '—'} base={project.stage} />,
  },
  {
    header: 'Bacia Hidrográfica',
    tdClassName: 'max-w-[180px] truncate text-ink-soft',
    hideBelow: 'md',
    cell: (project) => project.watershed || '—',
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
  const [status, setStatus] = useState('em_execucao');
  const { data: overallData } = useGetProjectsQuery({ page: 1, limit: 1 });
  const overallTotal = overallData?.pagination.total ?? null;

  const list = usePaginatedList<ProjectsResponse, Project, ProjectPageParams>(
    useGetProjectsQuery,
    (params) => ({ ...params, status }),
    (response) => ({
        items: response.projects,
        pagination: response.pagination,
        dataSource: response.dataSource,
      }),
    PAGE_SIZES[0],
    status,
  );

  const isFiltering = Boolean(status || list.search);

  // métricas da página carregada (mesma leitura do resumo antigo)
  const pageItems = list.items;
  const springs = pageItems.reduce(
    (total, project) => total + (project.property.totalSprings ?? 0),
    0,
  );
  const inProgress = pageItems.filter((project) => project.status === 'em_execucao').length;
  const executionLabel =
    list.loading && pageItems.length === 0 ? '—' : `${inProgress}/${pageItems.length}`;

  function openDetails(project: Project) {
    navigate(`/projetos/${project.id}/informacoes`);
  }

  return (
    <>
      <div className="mb-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
          API somente leitura · espelho diário
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-tight text-brand-deep">
          Projetos
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Consulta aos projetos do programa — dados espelhados diariamente do sistema MVGI.
        </p>
      </div>

      <Stats
        total={overallTotal ?? (isFiltering ? null : list.total)}
        executionLabel={executionLabel}
        springs={springs}
      />

      {list.error && <ApiErrorBanner error={list.error} onRetry={list.reload} />}

      <DataTableCard
        title="Projetos"
        placeholder="Busque um projeto"
        emptyMessage="Nenhum projeto encontrado com esse filtro."
        list={list}
        columns={COLUMNS}
        rowKey={(project) => project.id}
        pageSizes={PAGE_SIZES}
        onRowClick={openDetails}
        filters={
          <FilterChips
            ariaLabel="Filtrar por situação"
            options={STATUS_OPTIONS}
            selectedValue={status}
            onChange={setStatus}
          />
        }
      />

    </>
  );
}
