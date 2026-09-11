/**
 * Proposta técnica assinada de um projeto.
 *
 * O vínculo não é por nome de produtor (que diverge entre o SharePoint e o
 * banco: "Renan Batista" x "Renan Baptista", "Laura Eleoterio" x "Eleotero"),
 * e sim pela cadeia dura projects -> activities -> documents, usando a
 * atividade de upload chamada "Projeto técnico".
 */
import type { Request, Response } from 'express';

import config from '../config';
import { getPool } from '../db';
import { getDocumentStorage } from '../services/documentStorage';
import type { IdParams, ProposalDocumentRow, ProposalSummary } from '../types';

/** Nome da atividade de upload que carrega a proposta assinada no MV Gest. */
const PROPOSAL_ACTIVITY_NAME = 'Projeto técnico';

const PROPOSAL_QUERY = `
  SELECT d.id          AS "documentId",
         d.name        AS "documentName",
         d."mimeType",
         d."fileSize",
         d."filePath",
         a.id          AS "activityId",
         u.name        AS "producerName"
    FROM projects p
    JOIN activities a
      ON a."projectId" = p.id
     AND a."deletedAt" IS NULL
     AND a.name = $2
    JOIN documents d
      ON d.id = a."documentId"
     AND d."deletedAt" IS NULL
    LEFT JOIN properties pr ON pr.id = p."propertyId"
    LEFT JOIN producers prod ON prod.id = pr."producerId"
    LEFT JOIN users u ON u.id = prod."userId"
   WHERE p.id = $1
     AND p."deletedAt" IS NULL
     AND p."programId" = $3
   ORDER BY d."updatedAt" DESC NULLS LAST
   LIMIT 1
`;

/**
 * Parte dos uploads chegou com nome curto do DOS (`PROPOS~2.PDF`), o que faria
 * o produtor baixar um arquivo ilegível. Quando o nome está truncado assim,
 * remonta a partir do produtor; caso contrário preserva o que foi enviado.
 */
function resolveFileName(row: ProposalDocumentRow): string {
  const shortDosName = /~\d+\.[a-z0-9]+$/i.test(row.documentName);
  if (!shortDosName) return row.documentName;

  // nome curto do DOS vem todo em caixa alta, inclusive a extensão
  const extension = row.documentName.includes('.')
    ? row.documentName.slice(row.documentName.lastIndexOf('.')).toLowerCase()
    : '.pdf';

  if (!row.producerName) return `Proposta Técnica_assinado${extension}`;

  return `Proposta Técnica - ${row.producerName}_assinado${extension}`;
}

/** Content-Disposition aceita só ASCII; o nome real vai no filename*. */
function contentDisposition(fileName: string): string {
  const ascii = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_');
  return `attachment; filename="${ascii.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function findProposal(projectId: string): Promise<ProposalDocumentRow | null> {
  const result = await getPool().query<ProposalDocumentRow>(PROPOSAL_QUERY, [
    projectId,
    PROPOSAL_ACTIVITY_NAME,
    config.gestaguaProgramId,
  ]);
  return result.rows[0] ?? null;
}

/** GET /projetos/:id/proposta-tecnica — metadado, para o painel montar a aba. */
export async function detalhe(req: Request<IdParams>, res: Response) {
  const row = await findProposal(req.params.id);

  if (!row) {
    const vazio: ProposalSummary = {
      available: false,
      fileName: null,
      mimeType: null,
      fileSizeBytes: null,
      downloadable: false,
    };
    return res.json(vazio);
  }

  // head, não open: montar a aba não deve transferir o PDF inteiro do bucket
  const found = await getDocumentStorage().head({
    projectId: req.params.id,
    filePath: row.filePath,
  });

  const resumo: ProposalSummary = {
    available: true,
    fileName: resolveFileName(row),
    mimeType: row.mimeType,
    // o tamanho do storage é a verdade; o do banco pode estar defasado
    fileSizeBytes: found?.sizeBytes ?? row.fileSize,
    downloadable: found !== null,
  };

  return res.json(resumo);
}

/** GET /projetos/:id/proposta-tecnica/arquivo — os bytes. */
export async function baixar(req: Request<IdParams>, res: Response) {
  const row = await findProposal(req.params.id);

  if (!row) {
    return res.status(404).json({ erro: 'projeto sem proposta técnica assinada' });
  }

  const opened = await getDocumentStorage().open({
    projectId: req.params.id,
    filePath: row.filePath,
  });

  if (!opened) {
    return res.status(503).json({
      erro: 'proposta registrada no sistema, mas indisponível para download neste ambiente',
      storage: getDocumentStorage().kind,
    });
  }

  res.setHeader('Content-Type', row.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', contentDisposition(resolveFileName(row)));
  if (opened.sizeBytes > 0) res.setHeader('Content-Length', String(opened.sizeBytes));
  // documento com dado pessoal: não pode ficar em cache compartilhado
  res.setHeader('Cache-Control', 'private, no-store');

  // um erro no meio do stream chega tarde demais para virar status: aborta a
  // resposta em vez de entregar um PDF truncado como se estivesse completo
  opened.stream.on('error', () => res.destroy());
  res.on('close', () => opened.stream.destroy());

  return opened.stream.pipe(res);
}
