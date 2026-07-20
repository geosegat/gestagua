import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';

import config from './config';
import { log } from './log';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';

const app = express();
const publicDir = path.resolve(process.cwd(), 'public');
const indexHtml = path.join(publicDir, 'index.html');
const temFrontend = fs.existsSync(indexHtml);

app.disable('x-powered-by');
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('origem nao permitida pelo CORS'));
    },
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  }),
);
app.use(express.static(publicDir));
app.use(routes);

if (temFrontend) {
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    return res.sendFile(indexHtml);
  });
}

app.use((_req, res) => {
  return res.status(404).json({ erro: 'rota nao encontrada' });
});

app.use(errorHandler);

app.listen(config.port, () => {
  log(`API Gestagua escutando na porta ${config.port}`);
  log(
    temFrontend
      ? 'Frontend: servindo ./public'
      : 'Frontend: ./public vazio (modo só-API)',
  );
});
