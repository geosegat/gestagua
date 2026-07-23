import { Router } from 'express';
import path from 'node:path';

import * as dashboard from '../controllers/dashboardController';
import * as portalPublico from '../controllers/publicPortalController';
import * as indicadores from '../controllers/indicatorsController';
import * as mobilizacoes from '../controllers/mobilizationsController';
import * as modalidadesProjeto from '../controllers/projectModalitiesController';
import * as parcelasProjeto from '../controllers/projectInstallmentsController';
import * as etapasProjeto from '../controllers/projectStagesController';
import * as programs from '../controllers/programsController';
import * as projetos from '../controllers/projectsController';
import * as produtores from '../controllers/producersController';
import * as propriedades from '../controllers/propertiesController';
import { asyncHandler } from '../middlewares/asyncHandler';
import auth from '../middlewares/auth';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/demo', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'demo.html'));
});
router.get('/dashboard', asyncHandler(dashboard.summary));
// portal público: agregados curados, sem dado pessoal (ver o controller)
router.get('/publico/portal', asyncHandler(portalPublico.portal));

router.use(auth);
router.get('/indicadores', asyncHandler(indicadores.summary));
router.get('/projetos', asyncHandler(projetos.listar));
router.get('/projetos/:id/modalidades', asyncHandler(modalidadesProjeto.listar));
router.get('/projetos/:id/parcelas-produtor', asyncHandler(parcelasProjeto.listar));
router.get('/projetos/:id/etapas', asyncHandler(etapasProjeto.listarEtapas));
router.get(
  '/projetos/:id/etapas/:stageId/atividades',
  asyncHandler(etapasProjeto.listarAtividades),
);
router.get('/projetos/:id', asyncHandler(projetos.detalhe));
router.get('/produtores', asyncHandler(produtores.listar));
router.get('/propriedades', asyncHandler(propriedades.listar));
router.get('/mobilizacoes', asyncHandler(mobilizacoes.listar));
router.get('/programs', asyncHandler(programs.list));

export default router;
