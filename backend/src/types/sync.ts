/** Quem pediu a sincronização: o botão do painel ou o agendador da VPS. */
export type SyncTrigger = 'manual' | 'schedule';

export type SyncStatus = 'idle' | 'pending' | 'running';

/** Resultado da última execução concluída (com sucesso ou não). */
export interface SyncLastRun {
  finishedAt: string;
  ok: boolean;
  error: string | null;
  durationMs: number | null;
  trigger: SyncTrigger;
}

export interface SyncState {
  status: SyncStatus;
  /** Quando o botão foi clicado e ainda não foi atendido. */
  requestedAt: string | null;
  /** Quando o agente da VPS assumiu o trabalho. */
  startedAt: string | null;
  trigger: SyncTrigger | null;
  lastRun: SyncLastRun | null;
}

/** Eventos aceitos no POST: o painel manda `request`, o agente manda os outros. */
export type SyncEvent = 'request' | 'start' | 'finish';

export interface SyncEventBody {
  event?: SyncEvent;
  trigger?: SyncTrigger;
  ok?: boolean;
  error?: string;
}
