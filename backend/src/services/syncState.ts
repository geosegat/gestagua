import fs from 'node:fs';
import path from 'node:path';

import config from '../config';
import { log } from '../log';
import type { SyncLastRun, SyncState, SyncTrigger } from '../types';

/**
 * Estado da sincronização VPS -> Railway.
 *
 * Mora em ARQUIVO, e não numa tabela, de propósito: o banco que a API lê é o
 * espelho, e a sincronização sobrescreve justamente esse banco. Qualquer
 * controle guardado lá dentro seria apagado pelo processo que ele controla.
 *
 * Efeito colateral conhecido: em container com disco efêmero (Railway), um
 * redeploy zera o histórico. O que se perde é só o "última atualização"; um
 * pedido em aberto some junto, que é o comportamento seguro.
 */

const IDLE: SyncState = {
  status: 'idle',
  requestedAt: null,
  startedAt: null,
  trigger: null,
  lastRun: null,
};

/**
 * Execução parada há mais que isso é considerada perdida (VPS reiniciou, script
 * morreu no meio). Sem essa saída, uma falha silenciosa travaria o botão pra
 * sempre.
 */
const STALE_RUNNING_MS = 30 * 60 * 1000;

function isSyncState(value: unknown): value is SyncState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SyncState>;
  return (
    candidate.status === 'idle' ||
    candidate.status === 'pending' ||
    candidate.status === 'running'
  );
}

function read(): SyncState {
  try {
    const raw = fs.readFileSync(config.syncStateFile, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return isSyncState(parsed) ? parsed : IDLE;
  } catch {
    // arquivo ainda não existe (primeira execução) ou está corrompido
    return IDLE;
  }
}

/** Grava em arquivo temporário e renomeia, pra nunca deixar JSON pela metade. */
function write(state: SyncState): void {
  const target = config.syncStateFile;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(temp, target);
  } catch (error) {
    log(`Falha ao gravar o estado da sincronizacao: ${String(error)}`);
  }
}

/** Converte uma execução travada em falha, pra não bloquear novos pedidos. */
function settled(state: SyncState): SyncState {
  if (state.status !== 'running' || !state.startedAt) return state;
  if (Date.now() - Date.parse(state.startedAt) < STALE_RUNNING_MS) return state;

  return {
    ...IDLE,
    lastRun: {
      finishedAt: new Date().toISOString(),
      ok: false,
      error: 'a execução não respondeu a tempo e foi considerada perdida',
      durationMs: null,
      trigger: state.trigger ?? 'manual',
    },
  };
}

export function current(): SyncState {
  const state = read();
  const resolved = settled(state);
  if (resolved !== state) write(resolved);
  return resolved;
}

/**
 * Registra o pedido do painel. Já havendo pedido em aberto ou execução em
 * andamento, devolve o estado como está: clicar de novo não enfileira outra.
 */
export function request(): SyncState {
  const state = current();
  if (state.status !== 'idle') return state;

  const next: SyncState = {
    ...state,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    startedAt: null,
    trigger: 'manual',
  };
  write(next);
  return next;
}

/**
 * O agente da VPS assumiu o trabalho. Aceita começar sem pedido pendente
 * porque o mesmo agente roda no agendador diário.
 */
export function start(trigger: SyncTrigger): SyncState {
  const state = current();
  if (state.status === 'running') return state;

  const next: SyncState = {
    ...state,
    status: 'running',
    startedAt: new Date().toISOString(),
    trigger: state.status === 'pending' ? (state.trigger ?? trigger) : trigger,
  };
  write(next);
  return next;
}

/** O agente terminou. Guarda o resultado e libera pra um novo pedido. */
export function finish(ok: boolean, error: string | null): SyncState {
  const state = current();
  const startedAt = state.startedAt ? Date.parse(state.startedAt) : null;

  const lastRun: SyncLastRun = {
    finishedAt: new Date().toISOString(),
    ok,
    error: ok ? null : (error ?? 'falha não detalhada pelo agente'),
    durationMs: startedAt ? Date.now() - startedAt : null,
    trigger: state.trigger ?? 'manual',
  };

  const next: SyncState = { ...IDLE, lastRun };
  write(next);
  log(`Sincronizacao finalizada: ${ok ? 'sucesso' : `falha (${lastRun.error})`}`);
  return next;
}
