import type { NextFunction, Request, Response } from 'express';

import config from '../config';

/**
 * Portão geral da API. Aceita duas chaves: a distribuída à prefeitura
 * (`API_KEY`) e a do painel interno (`API_KEY_INTERNAL`, opcional).
 *
 * As duas abrem as rotas comuns. O que separa uma da outra é o
 * `requireInternalKey`, exigido nas rotas que servem dado pessoal — por isso
 * aqui a comparação é permissiva de propósito.
 */
export default function auth(
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  const key = req.get('x-api-key');
  const internal = config.internalApiKey.trim();

  const autorizada = Boolean(key) && (key === config.apiKey || (internal !== '' && key === internal));

  if (!autorizada) {
    return res.status(401).json({ erro: 'API key ausente ou invalida' });
  }

  next();
}
