import type { NextFunction, Request, Response } from 'express';

import config from '../config';
import { log } from '../log';

/**
 * Segundo portão, para rotas que entregam dado pessoal.
 *
 * A API foi prometida à prefeitura como "sem dados pessoais" (ver README), mas
 * o `x-api-key` é um só: quem tem a chave alcança qualquer rota. A proposta
 * técnica assinada é PDF com CPF, RG, assinatura e dados da propriedade, então
 * não pode ficar atrás da mesma chave que a prefeitura recebe.
 *
 * Com `API_KEY_INTERNAL` definida, estas rotas passam a exigir essa chave e a
 * chave da prefeitura deixa de servir. Sem ela, o comportamento continua o de
 * antes — e o servidor avisa no boot, porque isso é uma pendência, não um
 * padrão aceitável para produção.
 */
export default function requireInternalKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  const internal = config.internalApiKey.trim();

  // sem chave interna configurada: mantém o acesso de hoje (o `auth` global
  // já rodou), para não derrubar ambiente existente ao subir esta versão
  if (!internal) return next();

  if (req.get('x-api-key') !== internal) {
    return res.status(403).json({
      erro: 'esta rota exige a chave interna do painel',
    });
  }

  return next();
}

/** Chamado no boot: deixa a pendência visível em vez de silenciosa. */
export function warnIfInternalKeyMissing(): void {
  if (!config.internalApiKey.trim()) {
    log(
      'ATENCAO: API_KEY_INTERNAL nao definida - as rotas de proposta tecnica ' +
        '(PDF com dado pessoal) aceitam a mesma chave das demais rotas.',
    );
  }
}
