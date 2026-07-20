import fs from 'node:fs';

import config from './config';

export function log(message: string): void {
  const line = `${new Date().toISOString()}  ${message}`;
  console.log(line);

  try {
    fs.appendFileSync(config.logFile, `${line}\n`);
  } catch {}
}
