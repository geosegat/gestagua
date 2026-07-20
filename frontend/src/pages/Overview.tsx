import {
  Activity,
  Archive,
  ChevronRight,
  Droplets,
  FolderKanban,
  LandPlot,
  TreePine,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiErrorBanner from '../components/ApiErrorBanner';
import Card, { CARD, INNER_CARD } from '../components/Card';
import { MiniStat, StatCard } from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { getApiErrorMessage } from '../lib/apiError';
import { formatDate, formatNumber, mirrorLabel } from '../lib/format';
import { EASE, riseIn, stagger } from '../lib/motion';
import { useGetAllProjectsQuery } from '../services/gestaguaApi';

/* ---------- blocos ---------- */

function Section({
  title,
  subtitle,
  badge,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={riseIn}
      initial="hidden"
      animate="show"
      className={`p-6 ${CARD}`}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {badge && <span className="text-[12px] text-ink-soft">{badge}</span>}
        </div>
        {action}
      </div>
      {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </motion.section>
  );
}

function Bars({ data, accent }: { data: [string, number][]; accent?: boolean }) {
  const max = Math.max(1, ...data.map(([, n]) => n));
  const total = Math.max(1, data.reduce((s, [, n]) => s + n, 0));
  return (
    <div className="grid gap-3.5">
      {data.map(([label, n], i) => (
        <div key={label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium">{label}</span>
            <span className="shrink-0 text-ink-soft">
              {formatNumber(n)}
              <span className="ml-1.5 text-[11px] text-ink-soft/70">
                {Math.round((n / total) * 100)}%
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(n / max) * 100}%` }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.08 }}
              className={`h-full rounded-full ${accent ? 'bg-accent' : 'bg-brand'}`}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-[13px] text-ink-soft">Sem dados.</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={`stat-${i}`} className="h-33 animate-pulse" />
        ))}
      </div>
      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={`mini-${i}`} className="h-17 animate-pulse" />
        ))}
      </div>
      <Card className="mt-5 h-45 animate-pulse" />
      <Card className="mt-5 h-45 animate-pulse" />
    </div>
  );
}

/* ---------- página ---------- */

const NA = new Set(['', 'Não aplicável', 'não aplicável']);

export default function OverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGetAllProjectsQuery();
  const projects = data?.projects ?? null;
  const dataSource = data?.dataSource ?? null;
  const errorMessage = error ? getApiErrorMessage(error) : null;

  const metrics = useMemo(() => {
    const list = projects ?? [];
    const byStatus = { em_execucao: 0, cancelado: 0, arquivado: 0 } as Record<string, number>;
    const stages = new Map<string, number>();
    let springs = 0;
    let totalArea = 0;
    let nativeVegetationArea = 0;

    for (const project of list) {
      byStatus[project.status] = (byStatus[project.status] ?? 0) + 1;
      if (project.macroStage) {
        stages.set(project.macroStage, (stages.get(project.macroStage) ?? 0) + 1);
      }
      springs += project.property.totalSprings ?? 0;
      totalArea += project.property.totalAreaHa ?? 0;
      nativeVegetationArea += project.property.nativeVegetationAreaHa ?? 0;
    }

    const byStage = [...stages.entries()].sort((a, b) => b[1] - a[1]);
    const recentProjects = [...list]
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .slice(0, 15);

    return {
      byStatus,
      byStage,
      springs,
      totalArea,
      nativeVegetationArea,
      recentProjects,
    };
  }, [projects]);

  function openDetails(id: string) {
    navigate(`/projetos/${id}/informacoes`);
  }

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
            Visão geral do programa
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-tight text-brand-deep">
            Visão Geral
          </h1>
        </div>
        {dataSource && (
          <span className="rounded-full bg-accent-soft px-3.5 py-1.5 text-[12px] text-ink-soft">
            espelho de <b className="text-brand">{mirrorLabel(dataSource)}</b>
          </span>
        )}
      </motion.div>

      {errorMessage && (
        <ApiErrorBanner
          error={errorMessage}
          onRetry={() => void refetch()}
          message="Não consegui carregar os dados"
        />
      )}

      {isLoading && <Skeleton />}

      {projects && (
        <>
          {/* números principais */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4"
          >
            <StatCard
              icon={FolderKanban}
              value={projects.length}
              label="Projetos no programa"
              tone="brand"
              hint="Total de projetos registrados no espelho"
            />
            <StatCard
              icon={Activity}
              value={metrics.byStatus.em_execucao}
              label="Em execução"
              tone="ok"
              hint="Projetos com status em execução"
            />
            <StatCard
              icon={XCircle}
              value={metrics.byStatus.cancelado}
              label="Cancelados"
              tone="bad"
              hint="Projetos com status cancelado"
            />
            <StatCard
              icon={Archive}
              value={metrics.byStatus.arquivado}
              label="Arquivados"
              tone="warn"
              hint="Projetos com status arquivado"
            />
          </motion.div>

          {/* números do território */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mb-5 grid gap-3.5 sm:grid-cols-3"
          >
            <MiniStat icon={Droplets} value={metrics.springs} label="Nascentes" tone="accent" />
            <MiniStat
              icon={LandPlot}
              value={Math.round(metrics.totalArea)}
              suffix=" ha"
              label="Área total"
              tone="brand"
            />
            <MiniStat
              icon={TreePine}
              value={Math.round(metrics.nativeVegetationArea)}
              suffix=" ha"
              label="Vegetação nativa"
              tone="ok"
            />
          </motion.div>

          <div className="mb-5">
            <Section
              title="Etapas"
              badge={`${metrics.byStage.length} ${metrics.byStage.length === 1 ? 'etapa' : 'etapas'}`}
              subtitle="Projetos por etapa macro"
            >
              <Bars data={metrics.byStage} accent />
            </Section>
          </div>

          <Section
            title="Atualizados recentemente"
            subtitle="Últimas movimentações no espelho — clique pra ver o detalhe"
            action={
              <button
                onClick={() => navigate('/projetos')}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[13px] font-semibold text-brand transition-colors hover:text-brand-deep"
              >
                Ver todos
                <ChevronRight size={15} />
              </button>
            }
          >
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="brand-scroll -mr-1 grid max-h-[280px] gap-1.5 overflow-y-auto pr-1"
            >
              {metrics.recentProjects.map((project) => (
                <motion.button
                  key={project.id}
                  variants={riseIn}
                  onClick={() => openDetails(project.id)}
                  className={`group flex cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent-soft ${INNER_CARD}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">
                      {project.property.name || project.contract || 'Sem identificação'}
                    </div>
                    <div className="truncate text-[12px] text-ink-soft">
                      {NA.has(project.location.municipality ?? '')
                        ? '—'
                        : project.location.municipality}
                      {project.stage ? ` · ${project.stage}` : ''}
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-[12px] text-ink-soft sm:block">
                    {formatDate(project.updatedAt ?? null)}
                  </span>
                  <StatusBadge status={project.status} />
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-transparent transition-all group-hover:translate-x-0.5 group-hover:text-ink-soft/70"
                  />
                </motion.button>
              ))}
            </motion.div>
          </Section>
        </>
      )}
    </>
  );
}
