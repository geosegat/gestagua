import path from 'node:path';

import type { AppConfig } from './types';

try {
  process.loadEnvFile();
} catch {}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function envStr(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

function envList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}

function envPath(name: string, fallbackRelative: string): string {
  const raw = process.env[name];
  const target = raw === undefined || raw.trim() === '' ? fallbackRelative : raw;
  return path.resolve(process.cwd(), target);
}

const frontendOrigins = [
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'https://gestagua.vercel.app',
  'https://gestagua.arvo.tec.br',
];

const config: AppConfig = {
  port: envInt('PORT', 8080),
  apiKey: envStr('API_KEY', ''),
  allowedOrigins: Array.from(
    new Set([...frontendOrigins, ...envList('ALLOWED_ORIGINS', [])]),
  ),
  gestaguaProgramId: 'e0c5918f-32a5-44bd-917d-ad43fd3111b0',
  pointerFile: envPath('POINTER_FILE', 'banco_ativo.txt'),
  logFile: envPath('LOG_FILE', 'api.log'),
  syncStateFile: envPath('SYNC_STATE_FILE', 'sync-state.json'),
  db: {
    connectionString: envStr('DATABASE_URL', ''),
    host: envStr('DB_HOST', 'localhost'),
    port: envInt('DB_PORT', 5432),
    user: envStr('DB_USER', 'postgres'),
    password: envStr('DB_PASSWORD', ''),
  },
};

export default config;
