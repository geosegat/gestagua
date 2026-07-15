// ============================================================
// API Gestagua (somente leitura) — entry point.
//
// - Lê o pointer file (banco_ativo.txt) a cada requisição para
//   consultar sempre o clone do dia (ver src/db.ts).
// - Autenticação: x-api-key nas rotas de API (src/routes).
// - Serve o frontend buildado de ./public.
// ============================================================

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

import config from './config';
import { log } from './log';
import routes from './routes';

const app = express();

app.disable('x-powered-by');

// Usa a pasta public localizada na raiz do backend.
// process.cwd() evita problemas quando o código for compilado para dist.
const publicDir = path.resolve(process.cwd(), 'public');
const indexHtml = path.join(publicDir, 'index.html');
const temFrontend = fs.existsSync(indexHtml);

app.use(express.static(publicDir));

// API: health/demo públicos; demais rotas exigem x-api-key.
app.use(routes);

// SPA fallback: rotas como /login e /visao-geral retornam index.html.
if (temFrontend) {
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    return res.sendFile(indexHtml);
  });
}

// Qualquer outra rota.
app.use((_req, res) => {
  return res.status(404).json({
    erro: 'rota nao encontrada',
  });
});

// Inicialização do servidor.
app.listen(config.port, () => {
  log(`API Gestagua escutando na porta ${config.port}`);

  log(
    temFrontend
      ? 'Frontend: servindo ./public'
      : 'Frontend: ./public vazio (modo só-API)',
  );
});