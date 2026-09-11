import type { QueryResultRow } from 'pg';

/**
 * A proposta técnica assinada não é um arquivo solto: ela chega pelo MV Gest
 * como o documento da atividade de upload "Projeto técnico" do projeto. Esta
 * linha é o resultado de projects -> activities -> documents.
 */
export interface ProposalDocumentRow extends QueryResultRow {
  documentId: string;
  documentName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  activityId: string;
  producerName: string | null;
}

/** Metadado devolvido ao painel para decidir se habilita o botão de baixar. */
export interface ProposalSummary {
  available: boolean;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  /** Falso quando o arquivo está no banco mas não no storage configurado. */
  downloadable: boolean;
}
