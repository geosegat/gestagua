import type { RequestHandler } from 'express';

import type { AsyncController } from '../types';

export function asyncHandler(handler: AsyncController): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}
