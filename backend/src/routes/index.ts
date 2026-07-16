import { Router } from 'express';
import path from 'node:path';

import auth from '../middlewares/auth';
import * as mobilizacoes from '../controllers/mobilizationsController';
import * as programs from '../controllers/programsController';
import * as projetos from '../controllers/projectsController';
import * as produtores from '../controllers/producersController';
import * as propriedades from '../controllers/propertiesController';

const router = Router();

// ---------- rotas públicas (sem chave) ----------

// Saúde do serviço — não revela nada interno.
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Página de demonstração.
router.get('/demo', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'demo.html'));
});

// ---------- daqui para baixo: x-api-key obrigatória ----------
router.use(auth);

// Projetos do Gestagua.
router.get('/projetos', projetos.listar);
router.get('/projetos/:id', projetos.detalhe);

// Produtores do Gestagua.
router.get('/produtores', produtores.listar);

// Propriedades do Gestagua.
router.get('/propriedades', propriedades.listar);

// Mobilizacoes do Gestagua.
router.get('/mobilizacoes', mobilizacoes.listar);

// Programs available in the database mirror.
router.get('/programs', programs.list);

export default router;
