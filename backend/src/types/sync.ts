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

/** Uma linha de progresso reportada pelo worker enquanto a atualização roda. */
export interface SyncLogLine {
  at: string;
  message: string;
}

export interface SyncState {
  status: SyncStatus;
  /** Quando o botão foi clicado e ainda não foi atendido. */
  requestedAt: string | null;
  /** Quando o worker da VPS assumiu o trabalho. */
  startedAt: string | null;
  trigger: SyncTrigger | null;
  lastRun: SyncLastRun | null;
  /** Progresso do run atual (ou do último), pra mostrar ao vivo no painel. */
  logs: SyncLogLine[];
}

/** Eventos aceitos no POST: o painel manda `request`, o worker manda os outros. */
export type SyncEvent = 'request' | 'start' | 'log' | 'finish';

export interface SyncEventBody {
  event?: SyncEvent;
  trigger?: SyncTrigger;
  ok?: boolean;
  error?: string;
  /** Texto da linha de progresso quando event === 'log'. */
  message?: string;
}
