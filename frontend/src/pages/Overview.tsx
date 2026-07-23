import {
  Droplets,
  FolderKanban,
  LandPlot,
  TreePine,
} from '../icons';
import { motion } from 'framer-motion';
import ApiErrorBanner from '../components/ApiErrorBanner';
import Card, { CARD } from '../components/Card';
import OverviewIndicators from '../components/OverviewIndicators';
import { StatCard } from '../components/StatCard';
import SyncControl from '../components/SyncControl';
import YearFilter from '../components/YearFilter';
import { getApiErrorMessage } from '../lib/apiError';
import { formatNumber } from '../lib/format';
import {
  modalityClassification,
  modalityPresentation,
} from '../lib/modalities';
import { EASE, riseIn, stagger } from '../lib/motion';
import { useYearFilter } from '../lib/useYearFilter';
import {
  useGetDashboardSummaryQuery,
  useGetIndicatorsQuery,
} from '../services/gestaguaApi';

function Section({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={riseIn}
      initial="hidden"
      animate="show"
      className={`p-6 ${CARD}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {badge && <span className="text-[12px] text-ink-soft">{badge}</span>}
          </div>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

interface BarItem {
  label: string;
  classification: string;
  value: number;
}

function Bars({ data }: { data: BarItem[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-x-8">
      {data.map(({ label, classification, value }, index) => (
        <div key={`${label}-${classification}`}>
          <div className="mb-1.5 flex items-start justify-between gap-3 text-[13px]">
            <div className="min-w-0">
              <div className="font-medium leading-snug">{label}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-soft/70">
                {classification}
              </div>
            </div>
            <span className="shrink-0 text-ink-soft">
              {formatNumber(value)}
              <span className="ml-1.5 text-[11px] text-ink-soft/70">
                {Math.round((value / total) * 100)}%
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(value / max) * 100}%` }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.15 + index * 0.06 }}
              className="h-full rounded-full bg-accent"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-33 animate-pulse" />
        ))}
      </div>
      <Card className="mt-5 h-72 animate-pulse" />
    </div>
  );
}

export default function OverviewPage() {
  const { year, setYear } = useYearFilter();
  const { data, isLoading, error, refetch } = useGetDashboardSummaryQuery({ year });
  const {
    data: indicators,
    isLoading: indicatorsLoading,
    error: indicatorsError,
    refetch: refetchIndicators,
  } = useGetIndicatorsQuery({ year });
  const errorMessage = error ? getApiErrorMessage(error) : null;
  const indicatorsErrorMessage = indicatorsError
    ? getApiErrorMessage(indicatorsError)
    : null;
  const summary = data?.summary;
  const modalityBars: BarItem[] =
    data?.modalities.map((modality) => {
      const presentation = modalityPresentation(modality);
      return {
        label: presentation.shortTitle,
        classification: modalityClassification(presentation),
        value: modality.totalImplementations,
      };
    }) ?? [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mb-6 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
            Território ativo do programa
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-tight text-brand-deep">
            Visão Geral
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Indicadores de projetos em execução, sem cancelados ou arquivados.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <SyncControl />
          <YearFilter
            years={
              data?.filters?.availableYears ??
              indicators?.filters?.availableYears ??
              []
            }
            value={year}
            onChange={setYear}
          />
        </div>
      </motion.div>

      {errorMessage && (
        <ApiErrorBanner
          error={errorMessage}
          onRetry={() => void refetch()}
          message="Não consegui carregar os indicadores"
        />
      )}

      {isLoading && <Skeleton />}

      {summary && (
        <>
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4"
          >
            <StatCard
              icon={FolderKanban}
              value={summary.activeProjects}
              label="Projetos ativos"
              tone="brand"
              hint="Projetos em execução; cancelados e arquivados não entram no cálculo"
            />
            <StatCard
              icon={LandPlot}
              value={`${formatNumber(summary.totalAreaHa)} ha`}
              label="Área total"
              tone="accent"
              hint={`${formatNumber(summary.activeProperties)} propriedades ativas, sem duplicidade`}
            />
            <StatCard
              icon={TreePine}
              value={`${formatNumber(summary.nativeVegetationAreaHa)} ha`}
              label="Vegetação nativa"
              tone="ok"
              hint="Vegetação nativa nas propriedades de projetos ativos"
            />
            <StatCard
              icon={Droplets}
              value={summary.totalSprings}
              label="Nascentes"
              tone="accent"
              hint="Nascentes nas propriedades de projetos ativos"
            />
          </motion.div>

          <Section
            title="Modalidades"
            badge={`${formatNumber(summary.totalImplementations)} implantações`}
            subtitle="Nomes e grupos conforme o Decreto 14.210/2026; quantidades dos projetos em execução"
          >
            <Bars data={modalityBars} />
          </Section>

          {indicatorsErrorMessage && (
            <div className="mt-5">
              <ApiErrorBanner
                error={indicatorsErrorMessage}
                onRetry={() => void refetchIndicators()}
                message="Não consegui carregar os indicadores operacionais"
              />
            </div>
          )}

          {indicatorsLoading && <Card className="mt-5 h-80 animate-pulse" />}
          {indicators && <OverviewIndicators data={indicators} />}
        </>
      )}
    </>
  );
}
