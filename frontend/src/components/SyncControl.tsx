import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw, X } from '../icons';
import { useEffect, useRef, useState } from 'react';
import { formatDateTime } from '../lib/format';
import { RADIUS } from './Card';
import { useGetSyncStateQuery, useRequestSyncMutation } from '../services/gestaguaApi';

/**
 * Botão de atualizar os dados sob demanda, com o progresso ao vivo.
 *
 * O clique não executa a atualização: registra o pedido na API, e o worker que
 * roda na VPS assume, baixa do Azure e publica na Railway (ver
 * backend/scripts/sync-worker.ps1). Enquanto roda, o worker reporta cada etapa,
 * e este componente mostra as linhas conforme chegam. Por isso o polling só
 * liga quando há algo em andamento.
 */
function logTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR');
}

export default function SyncControl() {
  const [pollingInterval, setPollingInterval] = useState(0);
  const { data, isLoading } = useGetSyncStateQuery(undefined, {
    pollingInterval,
    skipPollingIfUnfocused: true,
  });
  const [requestSync, { isLoading: requesting }] = useRequestSyncMutation();
  const [open, setOpen] = useState(false);

  const busy = data?.status === 'pending' || data?.status === 'running';
  const running = data?.status === 'running';
  const lastRun = data?.lastRun;
  const logs = data?.logs ?? [];

  // enquanto há trabalho, consulta de perto; parado, não gasta requisição
  useEffect(() => {
    setPollingInterval(busy ? 2500 : 0);
  }, [busy]);

  // o painel de progresso abre sozinho quando começa a rodar
  useEffect(() => {
    if (busy) setOpen(true);
  }, [busy]);

  // rola o log pro fim a cada linha nova
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [logs.length, open]);

  async function handleClick() {
    if (busy || requesting) return;
    setOpen(true);
    try {
      await requestSync().unwrap();
    } catch {
      // 409: outra execução começou nesse meio tempo; o polling corrige
    }
  }

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

      {open && (logs.length > 0 || busy) && (
        <div
          className={`absolute right-0 top-full z-40 mt-2 w-[320px] border border-line bg-card p-3 shadow-[0_18px_40px_-20px_rgba(0,0,0,.35)] ${RADIUS}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              {running ? 'Atualizando o site' : 'Última atualização'}
            </span>
            {!busy && (
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {logs.map((line, index) => {
              const isLast = index === logs.length - 1;
              return (
                <div key={`${line.at}-${index}`} className="flex gap-2 text-[12px] leading-snug">
                  <span className="shrink-0 font-mono text-[10.5px] text-ink-soft/60">
                    {logTime(line.at)}
                  </span>
                  <span className={isLast && running ? 'font-medium text-ink' : 'text-ink-soft'}>
                    {line.message}
                  </span>
                  {isLast && running && (
                    <LoaderCircle size={12} className="mt-0.5 shrink-0 animate-spin text-accent" />
                  )}
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
