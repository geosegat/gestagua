import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  FileText,
  ListChecks,
  Route,
  TextCursorInput,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import ApiErrorBanner from '../components/ApiErrorBanner';
import {
  type ProjectActivity,
  type ProjectStageActivitiesResponse,
  type ProjectStagesResponse,
} from '../types';
import { getApiErrorMessage } from '../lib/apiError';
import { formatDate, formatNumber } from '../lib/format';
import {
  useGetProjectStageActivitiesQuery,
  useGetProjectStagesQuery,
} from '../services/gestaguaApi';

type ActivityFilter = 'all' | 'completed' | 'pending';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  checkbox: 'Verificação',
  date: 'Data',
  list: 'Grupo',
  text: 'Texto',
  upload: 'Documento',
};

function PageLoading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center" role="status">
      <div className="text-center text-sm text-ink-soft">
        <div className="mx-auto mb-4 h-5 w-5 animate-pulse rounded-[50%_50%_50%_0] bg-accent [transform:rotate(-45deg)]" />
        Carregando etapas e atividades…
      </div>
    </div>
  );
}

function formatBytes(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

function activityIcon(type: string): ReactNode {
  switch (type) {
    case 'date':
      return <CalendarDays size={15} aria-hidden="true" />;
    case 'text':
      return <TextCursorInput size={15} aria-hidden="true" />;
    case 'upload':
      return <Upload size={15} aria-hidden="true" />;
    case 'list':
      return <ListChecks size={15} aria-hidden="true" />;
    default:
      return <Circle size={14} aria-hidden="true" />;
  }
}

function activityValue(activity: ProjectActivity): ReactNode {
  switch (activity.type) {
    case 'checkbox':
      return activity.completed ? 'Concluída' : 'Pendente';
    case 'date':
      return activity.value.date ? formatDate(activity.value.date) : 'Data não informada';
    case 'text':
      return activity.value.text?.trim() || 'Texto não informado';
    case 'upload':
      return activity.document ? (
        <span className="inline-flex items-center gap-1.5">
          <FileText size={13} aria-hidden="true" />
          {activity.document.name}
          {formatBytes(activity.document.fileSize) && (
            <span className="text-ink-soft/70">· {formatBytes(activity.document.fileSize)}</span>
          )}
        </span>
      ) : 'Documento não enviado';
    default:
      return null;
  }
}

function ActivityRow({ activity, depth = 0 }: { activity: ProjectActivity; depth?: number }) {
  const isList = activity.type === 'list';
  const row = (
    <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <span className={`mt-0.5 shrink-0 ${activity.completed ? 'text-ok' : 'text-ink-soft/45'}`}>
        {activity.completed ? <CheckCircle2 size={17} aria-hidden="true" /> : activityIcon(activity.type)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[12.5px] font-semibold leading-5 text-ink sm:text-[13px]">{activity.name}</h3>
          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-soft/65">
            {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
          </span>
          {activity.required && (
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-brand/70">Obrigatória</span>
          )}
        </div>

        {!isList && (
          <div className={`mt-1.5 break-words text-[11.5px] leading-5 ${activity.completed ? 'text-ink-soft' : 'text-ink-soft/75'}`}>
            {activityValue(activity)}
          </div>
        )}

        {!isList && (activity.deadline || activity.completedAt) && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9.5px] text-ink-soft/65">
            {activity.deadline && <span>Prazo: {formatDate(activity.deadline)}</span>}
            {activity.completedAt && <span>Concluída em {formatDate(activity.completedAt)}</span>}
          </div>
        )}
      </div>

      {isList && (
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium text-ink-soft">
          {activity.children.length} {activity.children.length === 1 ? 'item' : 'itens'}
          <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </div>
      )}
    </div>
  );

  if (!isList) {
    return (
      <article className={depth > 0 ? 'border-l border-brand/15' : ''}>
        {row}
      </article>
    );
  }

  return (
    <details className="group" open>
      <summary className="cursor-pointer list-none outline-none transition-colors hover:bg-brand-soft/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
        {row}
      </summary>
      <div className="ml-5 border-l border-brand/15 sm:ml-8">
        {activity.children.length > 0 ? (
          activity.children.map((child) => <ActivityRow key={child.id} activity={child} depth={depth + 1} />)
        ) : (
          <p className="px-5 pb-4 text-[11px] text-ink-soft">Este grupo não possui atividades.</p>
        )}
      </div>
    </details>
  );
}

function filterActivities(activities: ProjectActivity[], filter: ActivityFilter): ProjectActivity[] {
  if (filter === 'all') return activities;
  const shouldShow = (activity: ProjectActivity) =>
    filter === 'completed' ? activity.completed : !activity.completed;

  return activities.flatMap((activity) => {
    const children = filterActivities(activity.children, filter);
    if (activity.type === 'list') {
      return children.length > 0 || shouldShow(activity) ? [{ ...activity, children }] : [];
    }
    return shouldShow(activity) ? [{ ...activity, children }] : [];
  });
}

function StageRail({
  data,
  selectedStageId,
  onSelect,
}: {
  data: ProjectStagesResponse;
  selectedStageId: string | null;
  onSelect: (id: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const rail = railRef.current;
      const activeButton = activeButtonRef.current;
      if (!rail || !activeButton) return;

      const railBox = rail.getBoundingClientRect();
      const buttonBox = activeButton.getBoundingClientRect();
      rail.scrollTop +=
        buttonBox.top - railBox.top - (rail.clientHeight - buttonBox.height) / 2;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedStageId]);

  const selectedStage = data.stages.find((stage) => stage.id === selectedStageId);

  return (
    <aside className="rounded-[14px] border border-line bg-card lg:sticky lg:top-4 lg:self-start">
      <header className="border-b border-line/70 px-5 py-4">
        <div className="flex items-center gap-2.5 text-brand-deep">
          <Route size={18} aria-hidden="true" />
          <h2 className="font-display text-[15px] font-semibold">Jornada do projeto</h2>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-ink-soft">
          {data.summary.completedStages} de {data.summary.totalStages} etapas concluídas
        </p>
      </header>

      <div className="p-4 lg:hidden">
        <label htmlFor="project-stage-select" className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft/70">
          Etapa selecionada
        </label>
        <select
          id="project-stage-select"
          value={selectedStageId ?? ''}
          onChange={(event) => onSelect(event.target.value)}
          className="mt-2 w-full rounded-[8px] border border-line bg-paper px-3 py-2.5 text-[12px] font-semibold text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        >
          {data.stages.map((stage, index) => (
            <option key={stage.id} value={stage.id}>
              {String(index + 1).padStart(2, '0')} · {stage.name}
            </option>
          ))}
        </select>
        {selectedStage && (
          <div className="mt-2 text-[10px] text-ink-soft">
            {selectedStage.progress}% · {selectedStage.completedActivities} de {selectedStage.totalActivities} atividades
          </div>
        )}
      </div>

      <div ref={railRef} data-testid="project-stage-rail" className="brand-scroll hidden max-h-[680px] space-y-1 overflow-y-auto p-3 lg:block">
        {data.stages.map((stage, index) => {
          const active = stage.id === selectedStageId;
          return (
            <button
              ref={active ? activeButtonRef : undefined}
              data-stage-selected={active ? 'true' : undefined}
              key={stage.id}
              type="button"
              onClick={() => onSelect(stage.id)}
              aria-pressed={active}
              className={`min-w-[235px] cursor-pointer border-l-2 px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent lg:min-w-0 lg:w-full ${
                active
                  ? 'border-accent bg-brand-soft/65'
                  : 'border-transparent hover:border-brand/25 hover:bg-brand-soft/25'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`pt-0.5 font-display text-[11px] font-semibold ${active ? 'text-brand' : 'text-ink-soft/50'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-soft/60">
                    {stage.macroStage?.name || 'Sem macroetapa'}
                  </div>
                  <div className={`mt-1 text-[11.5px] font-semibold leading-4 ${active ? 'text-brand-deep' : 'text-ink'}`}>
                    {stage.name}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9.5px] text-ink-soft">
                    <span>{stage.progress}%</span>
                    <span>·</span>
                    <span>{stage.completedActivities}/{stage.totalActivities}</span>
                  </div>
                </div>
                <span className={stage.status === 'completed' ? 'text-ok' : stage.status === 'current' ? 'text-accent' : 'text-ink-soft/35'}>
                  {stage.status === 'completed' ? <CheckCircle2 size={15} /> : stage.status === 'current' ? <Clock3 size={15} /> : <Circle size={14} />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function StageContent({
  data,
  loading,
  error,
  filter,
  onFilter,
  onRetry,
}: {
  data: ProjectStageActivitiesResponse | null;
  loading: boolean;
  error: string | null;
  filter: ActivityFilter;
  onFilter: (filter: ActivityFilter) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando atividades da etapa">
        <div className="h-44 animate-pulse rounded-[14px] border border-line bg-brand-soft/35" />
        {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-[10px] border border-line bg-card" />)}
      </div>
    );
  }

  if (error) {
    return <ApiErrorBanner error={error} onRetry={onRetry} message="Não foi possível carregar as atividades" />;
  }

  if (!data) return null;

  const activities = filterActivities(data.activities, filter);
  const { stage } = data;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[14px] border border-brand/10 bg-brand-soft/45 p-5 sm:p-6">
        <img
          src="/arvo-symbol-green.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 w-64 select-none opacity-[0.025]"
        />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand/65">
                {stage.macroStage?.name || 'Etapa do projeto'}
              </div>
              <h2 className="mt-1 font-display text-[20px] font-semibold text-brand-deep sm:text-[23px]">{stage.name}</h2>
              {stage.description && <p className="mt-2 text-[11.5px] leading-5 text-ink-soft">{stage.description}</p>}
            </div>
            <div className="font-display text-[25px] font-semibold text-brand-deep">{stage.progress}%</div>
          </div>

          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-card"
            role="progressbar"
            aria-label={`Progresso da etapa ${stage.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stage.progress}
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${stage.progress}%` }} />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10.5px] text-ink-soft">
            <span>{stage.completedActivities} de {stage.totalActivities} atividades concluídas</span>
            <span>Duração prevista: {formatNumber(stage.expectedDurationDays)} dias</span>
            {stage.maximumDurationDays !== null && <span>Máximo: {formatNumber(stage.maximumDurationDays)} dias</span>}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-line bg-card">
        <header className="flex flex-col gap-3 border-b border-line/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-brand-deep">Atividades</h2>
            <p className="mt-0.5 text-[10.5px] text-ink-soft">Valores registrados nesta etapa.</p>
          </div>

          <div className="flex flex-wrap gap-1" aria-label="Filtrar atividades">
            {([
              ['all', 'Todas'],
              ['completed', 'Concluídas'],
              ['pending', 'Pendentes'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => onFilter(value)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-[10px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  filter === value ? 'bg-brand text-on-brand' : 'bg-paper text-ink-soft hover:text-brand'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {activities.length > 0 ? (
          <div className="divide-y divide-line/70">
            {activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <ListChecks size={21} className="mx-auto text-brand/40" aria-hidden="true" />
            <p className="mt-3 text-[12.5px] font-medium text-ink">Nenhuma atividade neste filtro</p>
            <p className="mt-1 text-[11px] text-ink-soft">Escolha outro filtro ou uma etapa diferente.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProjectStagesPage() {
  const { projectId } = useParams();
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const stagesQuery = useGetProjectStagesQuery(projectId ?? '', { skip: !projectId });
  const stagesData = stagesQuery.data;

  useEffect(() => {
    if (!stagesData) return;
    setSelectedStageId((current) => {
      if (current && stagesData.stages.some((stage) => stage.id === current)) return current;
      return stagesData.currentStageId &&
        stagesData.stages.some((stage) => stage.id === stagesData.currentStageId)
        ? stagesData.currentStageId
        : (stagesData.stages[0]?.id ?? null);
    });
  }, [stagesData]);

  const activitiesQuery = useGetProjectStageActivitiesQuery(
    { projectId: projectId ?? '', stageId: selectedStageId ?? '' },
    { skip: !projectId || !selectedStageId },
  );

  useEffect(() => {
    setFilter('all');
  }, [selectedStageId]);

  const activitiesError = activitiesQuery.error
    ? getApiErrorMessage(activitiesQuery.error)
    : null;

  const selectedStage = useMemo(
    () => stagesData?.stages.find((stage) => stage.id === selectedStageId) ?? null,
    [selectedStageId, stagesData],
  );

  if (stagesQuery.isLoading) return <PageLoading />;

  if (!stagesData) {
    return (
      <ApiErrorBanner
        error={
          !projectId
            ? 'projeto não identificado'
            : stagesQuery.error
              ? getApiErrorMessage(stagesQuery.error)
              : 'etapas não encontradas'
        }
        onRetry={() => void stagesQuery.refetch()}
        message="Não foi possível carregar as etapas"
      />
    );
  }

  return (
    <>
      {stagesData.stages.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <StageRail
            data={stagesData}
            selectedStageId={selectedStageId}
            onSelect={(id) => setSelectedStageId(id)}
          />
          <section aria-live="polite" aria-label={selectedStage ? `Atividades de ${selectedStage.name}` : 'Atividades da etapa'}>
            <StageContent
              data={activitiesQuery.data ?? null}
              loading={activitiesQuery.isLoading}
              error={activitiesError}
              filter={filter}
              onFilter={setFilter}
              onRetry={() => void activitiesQuery.refetch()}
            />
          </section>
        </div>
      ) : (
        <section className="rounded-[14px] border border-dashed border-line bg-card px-5 py-12 text-center">
          <Route size={22} className="mx-auto text-brand/40" aria-hidden="true" />
          <h2 className="mt-3 font-display text-[15px] font-semibold text-brand-deep">Nenhuma etapa registrada</h2>
          <p className="mt-1 text-[11.5px] text-ink-soft">Este projeto ainda não possui etapas ou atividades vinculadas.</p>
        </section>
      )}
    </>
  );
}
