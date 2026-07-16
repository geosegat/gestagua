import path from 'node:path';

// ============================================================
// Configuração da API.
//
// Segredos (apiKey, senha do banco) vêm de variáveis de ambiente,
// carregadas de um arquivo .env local que NÃO é versionado
// (ver .gitignore). Os valores fixos abaixo são apenas defaults
// de DESENVOLVIMENTO — em produção defina as envs de verdade.
// Modelo das variáveis disponíveis em .env.example.
// ============================================================

// Node 20.12+/22 carrega o .env nativamente. Se o arquivo não
// existir (ex.: produção com envs já no ambiente), seguimos com
// os defaults sem quebrar.
try {
  process.loadEnvFile();
} catch {
  // Sem .env — usa envs do ambiente e/ou os defaults abaixo.
}

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

interface AppConfig {
  port: number;
  apiKey: string;
  gestaguaProgramId: string;
  pointerFile: string;
  logFile: string;
  db: DatabaseConfig;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function envStr(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

// Caminho configurável por env. Aceita valor absoluto (usado tal qual)
// ou relativo (resolvido a partir do diretório de trabalho). Sem env,
// cai no default relativo — por isso a API deve ser iniciada com o
// diretório de trabalho na raiz do backend (ver INSTALACAO.txt).
function envPath(name: string, fallbackRelative: string): string {
  const raw = process.env[name];
  const target =
    raw === undefined || raw.trim() === '' ? fallbackRelative : raw;

  return path.resolve(process.cwd(), target);
}

const config: AppConfig = {
  // Porta em que a API escuta.
  port: envInt('PORT', 8080),

  // Chave enviada no header "x-api-key".
  apiKey: envStr('API_KEY', '123'),

  // ID do programa Gestagua — constante de negócio, não é segredo.
  gestaguaProgramId: 'e0c5918f-32a5-44bd-917d-ad43fd3111b0',

  // Arquivo com o nome do banco ativo (na VPS costuma ficar fora da
  // pasta do app — defina POINTER_FILE com o caminho absoluto).
  pointerFile: envPath('POINTER_FILE', 'banco_ativo.txt'),

  // Arquivo de log local (idem: LOG_FILE aponta pra pasta de logs).
  logFile: envPath('LOG_FILE', 'api.log'),

  // Postgres local de teste.
  db: {
    host: envStr('DB_HOST', 'localhost'),
    port: envInt('DB_PORT', 5432),
    user: envStr('DB_USER', 'postgres'),
    password: envStr('DB_PASSWORD', '2011'),
  },
};

export default config;
