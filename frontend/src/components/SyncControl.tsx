import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw } from '../icons';
import { useEffect, useState } from 'react';
import { formatDateTime } from '../lib/format';
import { useGetSyncStateQuery, useRequestSyncMutation } from '../services/gestaguaApi';

/**
 * Botão de atualizar os dados sob demanda.
 *
 * O clique não executa a sincronização: ele registra o pedido na API, e o
 * agente que roda na VPS assume o trabalho na próxima checagem (ver
 * backend/scripts/sync-agent.ps1). Por isso a tela fica consultando o estado
 * enquanto houver algo em aberto, em vez de esperar uma resposta longa.
 */
export default function SyncControl() {
  // zero desliga o polling: fora de uma execução em andamento, o estado só é
  // buscado uma vez, quando a tela monta
  const [pollingInterval, setPollingInterval] = useState(0);
  const { data, isLoading } = useGetSyncStateQuery(undefined, {
    pollingInterval,
    skipPollingIfUnfocused: true,
  });
  const [requestSync, { isLoading: requesting }] = useRequestSyncMutation();

  const busy = data?.status === 'pending' || data?.status === 'running';
  const lastRun = data?.lastRun;

  useEffect(() => {
    setPollingInterval(busy ? 4000 : 0);
  }, [busy]);

  async function handleClick() {
    if (busy || requesting) return;
    try {
      await requestSync().unwrap();
    } catch {
      // 409 significa que outra execução começou nesse meio tempo; o próximo
      // ciclo de polling já mostra o estado correto
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <button
        onClick={handleClick}
        disabled={busy || requesting || isLoading}
        title={
          busy
            ? 'Já existe uma atualização em andamento'
            : 'Solicita uma atualização dos dados a partir do servidor de origem'
        }
        className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-line bg-card px-3.5 py-2 text-[13px] font-semibold text-brand transition-colors hover:border-accent hover:text-brand-deep disabled:cursor-default disabled:opacity-50"
      >
        {busy ? (
          <LoaderCircle size={15} className="animate-spin" />
        ) : (
          <RefreshCw size={15} />
        )}
        {data?.status === 'running'
          ? 'Atualizando…'
          : data?.status === 'pending'
            ? 'Na fila…'
            : 'Atualizar dados'}
      </button>

      {!busy && lastRun && (
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
          {lastRun.ok ? (
            <CheckCircle2 size={13} className="text-ok" />
          ) : (
            <AlertTriangle size={13} className="text-bad" />
          )}
          {lastRun.ok
            ? `atualizado em ${formatDateTime(lastRun.finishedAt)}`
            : 'a última atualização falhou'}
        </span>
      )}
    </div>
  );
}
