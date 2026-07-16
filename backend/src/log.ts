import fs from 'node:fs';

import config from './config';

// ---------- log simples (console + arquivo) ----------
export function log(msg: string): void {
  const line = `${new Date().toISOString()}  ${msg}`;

  console.log(line);

  try {
    fs.appendFileSync(config.logFile, `${line}\n`);
  } catch {
    // Falha ao gravar o log não deve derrubar a API.
  }
}