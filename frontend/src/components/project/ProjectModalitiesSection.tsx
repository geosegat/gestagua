import {
  ChevronDown,
  Droplets,
  LandPlot,
  Layers3,
  PackageOpen,
  Ruler,
  Sprout,
  Trees,
} from '../../icons';
import { useEffect, useState, type ReactNode } from 'react';
import {
  type ProjectModality,
  type ProjectModalityCulture,
  type ProjectModalityResource,
} from '../../types';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatDate, formatNumber } from '../../lib/format';
import {
  modalityClassification,
  modalityPresentation,
} from '../../lib/modalities';
import { useGetProjectModalitiesQuery } from '../../services/gestaguaApi';
import ApiErrorBanner from '../ApiErrorBanner';

const SUPPLY_TYPE_LABELS: Record<string, string> = {
  planned_project: 'Planejado pelo projeto',
  planned_producer: 'Planejado pelo produtor',
  executed: 'Executado',
  applied: 'Aplicado',
};

const LAND_USE_LABELS: Record<string, string> = {
  secondary_vegetation: 'Capoeira',
  secondary_vegetation_and_pasture: 'Capoeira e monocultura',
  native_forest: 'Floresta nativa',
  planted_forest: 'Floresta plantada',
  monoculture: 'Monocultura',
  monoculture_and_pasture: 'Monocultura e pastagem',
  pasture: 'Pastagem',
  pasture_and_planted_forest: 'Pastagem e floresta plantada',
  pasture_and_monoculture: 'Pastagem e monocultura',
};

const LAND_TYPE_LABELS: Record<string, string> = {
  periodic_flooding: 'Inundação periódica',
  swamp: 'Brejo',
  wetland: 'Área úmida',
  dry_and_stony: 'Seco e pedregoso',
};

const RELIEF_LABELS: Record<string, string> = {
  hill_top: 'Topo de morro',
  half_slope: 'Meia encosta',
  lowland: 'Baixada',
};

const CULTURE_TYPE_LABELS: Record<string, string> = {
  exotic: 'Exótica',
  native: 'Nativa',
};

const STRATUM_LABELS: Record<string, string> = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

const ARRANGEMENT_TYPE_LABELS: Record<string, string> = {
  PRIMARY: 'Principal',
  SECONDARY: 'Secundária',
  NATIVE: 'Nativa',
};

function valueOrDash(value: ReactNode): ReactNode {
  return value === null || value === undefined || value === '' ? 'Não informado' : value;
}

function translated(labels: Record<string, string>, value: string | null): string {
  return value ? (labels[value] ?? value) : 'Não informado';
}

function quantityLabel(resource: ProjectModalityResource): string {
  if (resource.quantity === null) return 'Não informado';
  const unit = resource.unitAbbreviation ?? resource.unitOfMeasurement ?? '';
  return `${formatNumber(resource.quantity)}${unit ? ` ${unit}` : ''}`;
}

function SummaryMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-l-2 border-accent/65 pl-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-soft/70">{label}</dt>
      <dd className="mt-1 font-display text-[18px] font-semibold text-brand-deep">{valueOrDash(value)}</dd>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-soft/65">{label}</dt>
      <dd className="mt-1 text-[12.5px] font-medium leading-5 text-ink">{valueOrDash(value)}</dd>
    </div>
  );
}

function ResourcePills({ resources }: { resources: ProjectModalityResource[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Insumos da cultura">
      {resources.map((resource) => (
        <span
          key={resource.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/10 bg-card px-2.5 py-1 text-[10.5px] font-medium text-ink-soft"
        >
          <PackageOpen size={11} className="text-brand" aria-hidden="true" />
          {resource.name} · {quantityLabel(resource)}
        </span>
      ))}
    </div>
  );
}

function CultureCard({ culture }: { culture: ProjectModalityCulture }) {
  const spacing =
    culture.spacingBetweenLinesM !== null && culture.spacingBetweenPlantsM !== null
      ? `${formatNumber(culture.spacingBetweenLinesM)} × ${formatNumber(culture.spacingBetweenPlantsM)} m`
      : null;

  return (
    <article className="rounded-[10px] border border-line/80 bg-paper/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="text-[13px] font-semibold text-brand-deep">{culture.name}</h5>
          <p className="mt-1 text-[10.5px] text-ink-soft">
            {translated(CULTURE_TYPE_LABELS, culture.cultureType)} · estrato {translated(STRATUM_LABELS, culture.stratum).toLowerCase()}
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-brand-deep">
          {translated(SUPPLY_TYPE_LABELS, culture.supplyType)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <DetailField label="Quantidade" value={formatNumber(culture.quantity)} />
        <DetailField label="Área" value={culture.areaHa !== null ? `${formatNumber(culture.areaHa)} ha` : null} />
        <DetailField label="Espaçamento" value={spacing} />
        <DetailField label="Fornecimento" value={formatDate(culture.supplyDate)} />
      </dl>

      <ResourcePills resources={culture.resources} />
    </article>
  );
}

function ArrangementBlock({ modality }: { modality: ProjectModality }) {
  const arrangement = modality.arrangement;
  if (!arrangement) return null;

  return (
    <section className="rounded-[11px] border border-brand/10 bg-brand-soft/45 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-brand">
          <Layers3 size={18} aria-hidden="true" />
        </span>
        <div>
          <h4 className="text-[12.5px] font-semibold text-brand-deep">Arranjo · {valueOrDash(arrangement.name)}</h4>
          <p className="mt-1 text-[10.5px] text-ink-soft">
            {arrangement.plantingDensity !== null
              ? `${formatNumber(arrangement.plantingDensity)} plantas por hectare`
              : 'Densidade não informada'}
          </p>
        </div>
      </div>

      {arrangement.cultures.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {arrangement.cultures.map((culture) => (
            <div key={culture.id} className="rounded-[8px] bg-card/85 px-3 py-2.5">
              <div className="text-[11.5px] font-semibold text-ink">{culture.name}</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-[0.08em] text-ink-soft">
                {translated(ARRANGEMENT_TYPE_LABELS, culture.type)} · {culture.lines.length} {culture.lines.length === 1 ? 'linha' : 'linhas'}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ModalityCard({
  item,
  index,
  expanded,
  onToggle,
}: {
  item: ProjectModality;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const contentId = `modalidade-${item.id}`;
  const presentation = modalityPresentation(item.modality);
  const resourceCount =
    item.resources.length + item.cultures.reduce((total, culture) => total + culture.resources.length, 0);

  return (
    <article className="overflow-hidden rounded-[12px] border border-line bg-card transition-colors hover:border-brand/25">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-start gap-3 bg-transparent px-4 py-4 text-left outline-none transition-colors hover:bg-brand-soft/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-5"
      >
        <span className="mt-1 shrink-0 text-brand">
          {item.modality.type === 'physical_intervention' ? <LandPlot size={19} /> : <Sprout size={19} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft/65">
              Implantação {String(index + 1).padStart(2, '0')}
            </span>
            <span className="rounded-full bg-paper px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-brand">
              {item.modality.code}
            </span>
            <span
              className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${
                presentation.official ? 'text-brand/65' : 'text-warn'
              }`}
            >
              {modalityClassification(presentation)}
            </span>
          </div>
          <h3 className="mt-1 font-display text-[15px] font-semibold text-brand-deep sm:text-[16px]">
            {presentation.title}
          </h3>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[10.5px] text-ink-soft">
            {presentation.detail && <span>{presentation.detail}</span>}
            {item.areaHa !== null && <span>{formatNumber(item.areaHa)} ha planejados</span>}
            {item.executedAreaHa !== null && <span>{formatNumber(item.executedAreaHa)} ha executados</span>}
            {item.cultures.length > 0 && <span>{item.cultures.length} culturas</span>}
            {resourceCount > 0 && <span>{resourceCount} insumos</span>}
          </div>
        </div>

        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`mt-2 shrink-0 text-brand transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div id={contentId} className="border-t border-line/70 px-4 py-5 sm:px-5">
          {item.modality.definition && (
            <p className="mb-5 max-w-4xl text-[12.5px] leading-6 text-ink-soft">{item.modality.definition}</p>
          )}

          <dl className="grid gap-x-5 gap-y-4 rounded-[10px] bg-paper/55 p-4 sm:grid-cols-3 lg:grid-cols-6">
            <DetailField label="Uso anterior" value={translated(LAND_USE_LABELS, item.previousLandUse)} />
            <DetailField label="Tipo de solo" value={translated(LAND_TYPE_LABELS, item.landType)} />
            <DetailField label="Relevo" value={translated(RELIEF_LABELS, item.relief)} />
            <DetailField label="Irrigação" value={item.irrigation ? 'Sim' : 'Não'} />
            <DetailField label="Vegetação nativa" value={item.nativeVegetationAreaHa !== null ? `${formatNumber(item.nativeVegetationAreaHa)} ha` : null} />
            <DetailField label="Nascentes" value={formatNumber(item.totalSprings)} />
          </dl>

          <div className="mt-4">
            <ArrangementBlock modality={item} />
          </div>

          {item.cultures.length > 0 && (
            <section className="mt-5">
              <div className="mb-3 flex items-center gap-2 text-brand-deep">
                <Sprout size={15} aria-hidden="true" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em]">Culturas planejadas</h4>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {item.cultures.map((culture) => <CultureCard key={culture.id} culture={culture} />)}
              </div>
            </section>
          )}

          {item.resources.length > 0 && (
            <section className="mt-5">
              <div className="mb-3 flex items-center gap-2 text-brand-deep">
                <PackageOpen size={15} aria-hidden="true" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em]">Recursos da implantação</h4>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {item.resources.map((resource) => (
                  <div key={resource.id} className="rounded-[9px] border border-line/80 bg-paper/45 px-3.5 py-3">
                    <div className="text-[12px] font-semibold text-ink">{resource.name}</div>
                    <div className="mt-1 text-[10.5px] text-ink-soft">
                      {quantityLabel(resource)} · {translated(SUPPLY_TYPE_LABELS, resource.supplyType)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!item.arrangement && item.cultures.length === 0 && item.resources.length === 0 && (
            <p className="mt-4 text-[12px] text-ink-soft">Não há culturas, arranjo ou insumos vinculados a esta implantação.</p>
          )}
        </div>
      )}
    </article>
  );
}

function ModalitiesLoading() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando modalidades">
      {[0, 1].map((item) => (
        <div key={item} className="h-[92px] animate-pulse rounded-[12px] border border-line bg-brand-soft/35" />
      ))}
    </div>
  );
}

export default function ProjectModalitiesSection({ projectId }: { projectId: string }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { data, isLoading, error, refetch } = useGetProjectModalitiesQuery(projectId);
  const errorMessage = error ? getApiErrorMessage(error) : null;

  useEffect(() => {
    if (data) {
      const firstDetailed = data.modalities.find(
        (item) => item.arrangement || item.cultures.length > 0 || item.resources.length > 0 || item.areaHa !== null,
      );
      setExpandedIds(firstDetailed ? new Set([firstDetailed.id]) : new Set());
    }
  }, [data]);

  const toggle = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="relative overflow-hidden rounded-[14px] border border-line bg-card lg:col-span-2">
      <img
        src="/arvo-symbol-green.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 w-72 select-none opacity-[0.025]"
      />
      <header className="relative flex flex-col gap-4 border-b border-line/70 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-brand">
            <Trees size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-[16px] font-semibold text-brand-deep">Modalidades</h2>
            <p className="mt-0.5 max-w-2xl text-[12px] leading-5 text-ink-soft">
              Enquadramento do Decreto 14.210/2026, áreas, culturas e recursos do projeto.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand/65">
          <Droplets size={13} aria-hidden="true" /> dados de planejamento
        </div>
      </header>

      <div className="relative p-5 sm:p-6">
        {isLoading && <ModalitiesLoading />}

        {!isLoading && errorMessage && (
          <ApiErrorBanner
            error={errorMessage}
            onRetry={() => void refetch()}
            message="Não foi possível carregar as modalidades"
          />
        )}

        {!isLoading && data && (
          <>
            <dl className="mb-5 grid grid-cols-2 gap-4 rounded-[11px] border border-brand/10 bg-brand-soft/35 px-4 py-4 sm:grid-cols-5 sm:px-5">
              <SummaryMetric label="Implantações" value={formatNumber(data.summary.totalImplantations)} />
              <SummaryMetric label="Área planejada" value={data.summary.plannedAreaHa !== null ? `${formatNumber(data.summary.plannedAreaHa)} ha` : null} />
              <SummaryMetric label="Área executada" value={data.summary.executedAreaHa !== null ? `${formatNumber(data.summary.executedAreaHa)} ha` : null} />
              <SummaryMetric label="Culturas" value={formatNumber(data.summary.totalCultures)} />
              <SummaryMetric label="Insumos" value={formatNumber(data.summary.totalResources)} />
            </dl>

            {data.modalities.length > 0 ? (
              <div className="space-y-3">
                {data.modalities.map((item, index) => (
                  <ModalityCard
                    key={item.id}
                    item={item}
                    index={index}
                    expanded={expandedIds.has(item.id)}
                    onToggle={() => toggle(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[11px] border border-dashed border-line px-5 py-8 text-center">
                <Ruler size={20} className="mx-auto text-brand/45" aria-hidden="true" />
                <p className="mt-3 text-[13px] font-medium text-ink">Nenhuma modalidade cadastrada</p>
                <p className="mt-1 text-[11.5px] text-ink-soft">O projeto ainda não possui áreas de implantação vinculadas.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
