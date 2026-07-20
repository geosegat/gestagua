import type { ErrorRequestHandler } from 'express';

import { log } from '../log';

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : null;

  log(`ERRO ${req.method} ${req.originalUrl}: ${message}`);
  if (stack) log(stack);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({ erro: 'erro interno' });
};
