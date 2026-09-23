import { AlertTriangle, CheckCircle2, Circle, LoaderCircle, RefreshCw, X } from '../icons';
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { formatDateTime } from '../lib/format';
import { RADIUS } from './Card';
import {
  gestaguaApi,
  useGetSyncStateQuery,
  useRequestSyncMutation,
} from '../services/gestaguaApi';
import type { SyncState } from '../types';

/**
 * Botão de atualizar os dados sob demanda, com o progresso ao vivo.
 *
 * O clique não executa a atualização: registra o pedido na API, e o worker que
 * roda na VPS assume, baixa do Azure e publica na Railway (ver
 * backend/scripts/sync-worker.ps1). Enquanto roda, o worker reporta cada etapa,
 * e este componente mostra em que passo está. Por isso o polling só liga quando
 * há algo em andamento.
 */

interface SyncStep {
  /** etapa que o worker reporta; null = na fila, antes de o worker assumir */
  key: string | null;
  label: string;
  /** texto enquanto o passo está em andamento, quando difere do rótulo */
  activeLabel?: string;
  hint?: string;
}

/**
 * Os passos na linguagem de quem usa o painel: sem nome de fornecedor nem de
 * ferramenta. As mensagens técnicas do worker ficam só no registro da API.
 */
const STEPS: SyncStep[] = [
  {
    key: null,
    label: 'Pedido recebido',
    activeLabel: 'Aguardando o início',
    hint: 'Começa em até 2 minutos.',
  },
  { key: 'download', label: 'Buscando os dados mais recentes' },
  {
    key: 'publish',
    label: 'Publicando no site',
    hint: 'Se alguma tela falhar nesses segundos, é só recarregar.',
  },
  { key: 'check', label: 'Conferindo os dados' },
];

/** Tags de tudo que mostra dado do banco: o que a atualização troca. */
const DATA_TAGS = [
  'Project',
  'Projects',
  'Indicators',
  'Producers',
  'Properties',
  'Mobilizations',
  'Programs',
] as const;

/**
 * Em que passo a atualização está. Na fila é o primeiro; rodando, é a última
 * etapa que o worker reportou. Sem etapa ainda (acabou de começar, ou worker
 * antigo que só manda texto), fica na busca dos dados.
 */
function currentStep(state: SyncState): number {
  if (state.status === 'pending') return 0;
  const reported = state.logs.map((line) =>
    STEPS.findIndex((item) => item.key !== null && item.key === line.step),
  );
  return Math.max(1, ...reported);
}

/** Cronômetro "1:05". Relógios do servidor e do navegador divergem um pouco. */
function formatElapsed(since: string | null, now: number): string {
  const start = since ? Date.parse(since) : NaN;
  if (isNaN(start)) return '';
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** "45 s", "2 min", "2 min 10 s". */
function formatTook(ms: number | null): string | null {
  if (ms === null) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const rest = seconds % 60;
  return `${Math.floor(seconds / 60)} min${rest ? ` ${rest} s` : ''}`;
}

/** Relógio que só anda enquanto `active`, pro cronômetro da espera. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export default function SyncControl() {
  const [pollingInterval, setPollingInterval] = useState(0);
  const { data, isLoading } = useGetSyncStateQuery(undefined, {
    pollingInterval,
    skipPollingIfUnfocused: true,
  });
  const [requestSync, { isLoading: requesting }] = useRequestSyncMutation();
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();

  const busy = data?.status === 'pending' || data?.status === 'running';
  const running = data?.status === 'running';
  const lastRun = data?.lastRun;
  const now = useNow(busy);

  // enquanto há trabalho, consulta de perto; parado, não gasta requisição
  useEffect(() => {
    setPollingInterval(busy ? 2500 : 0);
  }, [busy]);

  // o painel de progresso abre sozinho quando começa a rodar
  useEffect(() => {
    if (busy) setOpen(true);
  }, [busy]);

  // terminou bem: recarrega os números da tela, que ainda são os de antes
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy && lastRun?.ok) {
      dispatch(gestaguaApi.util.invalidateTags([...DATA_TAGS]));
    }
    wasBusy.current = busy;
  }, [busy, lastRun?.ok, dispatch]);

  async function handleClick() {
    if (busy || requesting) return;
    setOpen(true);
    try {
      await requestSync().unwrap();
    } catch {
      // 409: outra execução começou nesse meio tempo; o polling corrige
    }
  }

  const step = data && busy ? currentStep(data) : -1;
  const took = lastRun ? formatTook(lastRun.durationMs) : null;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        <button
          onClick={handleClick}
          disabled={busy || requesting || isLoading}
          title="Baixa os dados mais recentes do sistema e publica no site"
          className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-line bg-card px-3.5 py-2 text-[13px] font-semibold text-brand transition-colors hover:border-accent hover:text-brand-deep disabled:cursor-default disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {running ? 'Atualizando…' : data?.status === 'pending' ? 'Na fila…' : 'Atualizar dados'}
        </button>

        {!busy && lastRun && (
          <button
            onClick={() => setOpen((v) => !v)}
            title="Ver detalhes da última atualização"
            className="inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] text-ink-soft transition-colors hover:text-brand"
          >
            {lastRun.ok ? (
              <CheckCircle2 size={13} className="text-ok" />
            ) : (
              <AlertTriangle size={13} className="text-bad" />
            )}
            {lastRun.ok
              ? `atualizado em ${formatDateTime(lastRun.finishedAt)}`
              : 'a última atualização falhou'}
          </button>
        )}
      </div>

      {open && data && (busy || lastRun) && (
        <div
          className={`absolute right-0 top-full z-40 mt-2 w-[320px] border border-line bg-card p-4 shadow-[0_18px_40px_-20px_rgba(0,0,0,.35)] ${RADIUS}`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              {busy ? 'Atualizando os dados' : 'Última atualização'}
            </span>
            {busy ? (
              <span
                title="Tempo desde o pedido"
                className="font-mono text-[11px] tabular-nums text-ink-soft"
              >
                {formatElapsed(data.requestedAt ?? data.startedAt, now)}
              </span>
            ) : (
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* anuncia a troca de passo e o resultado; o cronômetro fica de fora */}
          <div aria-live="polite">
            {busy ? (
              <>
                <ol className="space-y-2.5">
                  {STEPS.map((item, index) => {
                    const done = index < step;
                    const active = index === step;
                    return (
                      <li key={item.label} className="flex gap-2.5 text-[12.5px] leading-snug">
                        {done && <CheckCircle2 size={15} className="mt-px shrink-0 text-ok" />}
                        {active && (
                          <LoaderCircle size={15} className="mt-px shrink-0 animate-spin text-accent" />
                        )}
                        {!done && !active && <Circle size={15} className="mt-px shrink-0 text-line" />}
                        <div>
                          <div
                            className={
                              active
                                ? 'font-medium text-ink'
                                : done
                                  ? 'text-ink-soft'
                                  : 'text-ink-soft/60'
                            }
                          >
                            {active ? (item.activeLabel ?? item.label) : item.label}
                          </div>
                          {active && item.hint && (
                            <div className="mt-0.5 text-[11px] text-ink-soft">{item.hint}</div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-3.5 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-soft">
                  Pode continuar usando o painel. Os números se atualizam sozinhos quando terminar.
                </p>
              </>
            ) : (
              lastRun && (
                <div className="flex gap-2.5">
                  {lastRun.ok ? (
                    <CheckCircle2 size={17} className="mt-px shrink-0 text-ok" />
                  ) : (
                    <AlertTriangle size={17} className="mt-px shrink-0 text-bad" />
                  )}
                  <div>
                    <div className="text-[13px] font-medium text-ink">
                      {lastRun.ok ? 'Dados atualizados' : 'Não foi possível atualizar'}
                    </div>
                    {/* o erro técnico fica só no title: ajuda quem mantém, sem
                        expor nome de fornecedor pra quem usa o painel */}
                    <p
                      title={lastRun.ok ? undefined : (lastRun.error ?? undefined)}
                      className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft"
                    >
                      {lastRun.ok
                        ? `${formatDateTime(lastRun.finishedAt)}${took ? ` · levou ${took}` : ''}`
                        : 'Os dados continuam os da última atualização. Tente de novo em alguns minutos.'}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
