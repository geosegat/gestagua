import fs from 'node:fs';
import { Pool } from 'pg';

import config from './config';
import { log } from './log';

let currentDb: string | null = null;
let currentSource: string | null = null;
let pool: Pool | null = null;

export function getPool(): Pool {
  const connectionString = config.db.connectionString.trim();

  if (connectionString) {
    if (!pool || currentSource !== connectionString) {
      const oldPool = pool;
      pool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30_000,
      });
      currentSource = connectionString;

      try {
        currentDb = decodeURIComponent(new URL(connectionString).pathname.slice(1));
      } catch {
        currentDb = 'DATABASE_URL';
      }

      log(`Conectando ao banco: ${currentDb}`);
      if (oldPool) void oldPool.end().catch(() => undefined);
    }

    return pool;
  }

  const db = fs.readFileSync(config.pointerFile, 'utf8').trim();

  if (!db) throw new Error('banco_ativo.txt vazio');

  const source = `pointer:${db}`;
  if (!pool || source !== currentSource) {
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
    currentSource = source;
    currentDb = db;
    log(`Conectando ao banco ativo: ${db}`);

    if (oldPool) void oldPool.end().catch(() => undefined);
  }

  return pool;
}

export function getCurrentDb(): string | null {
  return currentDb;
}
