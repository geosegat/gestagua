import type { NextFunction, Request, Response } from 'express';

import config from '../config';

// ---------- autenticação ----------
// Exige o header x-api-key. Aplicado somente nas rotas de API.
// /health, /demo e os arquivos do frontend ficam fora da exigência.

export default function auth(
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  const key = req.get('x-api-key');

  if (!key || key !== config.apiKey) {
    return res.status(401).json({
      erro: 'API key ausente ou invalida',
    });
  }

  next();
}