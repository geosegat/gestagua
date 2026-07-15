import fs from 'node:fs';
import { Pool } from 'pg';

import config from './config';
import { log } from './log';

let currentDb: string | null = null;
let pool: Pool | null = null;

export function getPool(): Pool {
  const db = fs.readFileSync(config.pointerFile, 'utf8').trim();

  if (!db) {
    throw new Error('banco_ativo.txt vazio');
  }

  if (!pool || db !== currentDb) {
    const oldPool = pool;

    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: db,
      max: 10,
      idleTimeoutMillis: 30_000,
    });

    currentDb = db;

    log(`Conectando ao banco ativo: ${db}`);

    if (oldPool) {
      void oldPool.end().catch(() => {
        // Falha ao encerrar o pool antigo não deve derrubar a API.
      });
    }
  }

  return pool;
}

export function getCurrentDb(): string | null {
  return currentDb;
}