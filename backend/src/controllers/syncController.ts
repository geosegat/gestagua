import type { Request, Response } from 'express';

import * as syncState from '../services/syncState';
import type { SyncEventBody } from '../types';

/**
 * Sincronização VPS -> Railway.
 *
 * A API não executa o dump nem o restore: ela só guarda a intenção. Quem faz o
 * trabalho é o agente que roda na VPS (scripts/sync-agent.ps1), que consulta
 * este estado de tempos em tempos. O desenho é esse porque a VPS é quem tem o
 * banco de origem e o pg_dump, e assim ela só faz chamadas de saída, sem
 * precisar abrir porta nenhuma pra internet.
 */

/** GET /admin/sync - situação atual, consumida pelo painel e pelo agente. */
export function status(_req: Request, res: Response): Response {
  return res.json(syncState.current());
}

/**
 * POST /admin/sync - avança a máquina de estados.
 * `request` vem do botão do painel; `start` e `finish` vêm do agente.
 */
export function event(
  req: Request<object, object, SyncEventBody>,
  res: Response,
): Response {
  const body = req.body ?? {};
  const trigger = body.trigger === 'schedule' ? 'schedule' : 'manual';

  switch (body.event) {
    case 'request': {
      const state = syncState.request();
      // 409 só enquanto uma execução está em andamento; clicar de novo com um
      // pedido já na fila é inofensivo e responde 202 do mesmo jeito
      return res.status(state.status === 'running' ? 409 : 202).json(state);
    }

    case 'start':
      return res.status(202).json(syncState.start(trigger));

    case 'finish':
      return res.json(
        syncState.finish(body.ok === true, typeof body.error === 'string' ? body.error : null),
      );

    default:
      return res.status(400).json({
        erro: 'event invalido. Use request, start ou finish',
      });
  }
}
