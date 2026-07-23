/** Quem pediu a sincronização: o botão do painel ou o agendador da VPS. */
export type SyncTrigger = 'manual' | 'schedule';

export type SyncStatus = 'idle' | 'pending' | 'running';

export interface SyncLastRun {
  finishedAt: string;
  ok: boolean;
  error: string | null;
  durationMs: number | null;
  trigger: SyncTrigger;
}

export interface SyncLogLine {
  at: string;
  message: string;
}

export interface SyncState {
  status: SyncStatus;
  requestedAt: string | null;
  startedAt: string | null;
  trigger: SyncTrigger | null;
  lastRun: SyncLastRun | null;
  logs: SyncLogLine[];
}
