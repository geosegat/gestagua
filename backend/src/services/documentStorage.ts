/**
 * Último metro da entrega de documentos.
 *
 * O banco do painel é um espelho do MV Gest: ele traz o *metadado* do documento
 * (nome, tamanho, `filePath`), mas o sync (`scripts/sync-worker.ps1`) carrega só
 * o Postgres, não os blobs. Então quem serve os bytes é decisão de ambiente, e
 * fica isolada aqui atrás de uma interface.
 *
 * Hoje roda `local`, lendo de um diretório apontado por PROPOSALS_DIR, onde os
 * arquivos são nomeados pelo id do projeto (ver scripts/seed-propostas.js).
 * Trocar para o storage do MV Gest ou para um bucket S3-compatível é escrever
 * outro adapter com esta mesma interface e ler `ref.filePath` em vez de
 * `ref.projectId` — nada fora deste arquivo muda.
 */
import fs from 'node:fs';
import path from 'node:path';

import config from '../config';

export interface StorageRef {
  /** Chave usada pelo adapter local. */
  projectId: string;
  /** Caminho canônico do MV Gest — a chave dos adapters remotos. */
  filePath: string;
}

export interface OpenedDocument {
  absolutePath: string;
  sizeBytes: number;
}

export interface DocumentStorage {
  readonly kind: string;
  /** Descreve o destino para diagnóstico, sem vazar credencial. */
  readonly describe: string;
  open(ref: StorageRef): Promise<OpenedDocument | null>;
}

/**
 * Lê de um diretório local. Os arquivos são gravados como `<projectId>.pdf`
 * para que a resolução seja exata: sem casar nome de produtor em tempo de
 * requisição, que é justamente o que quebra com acento e grafia divergente.
 */
class LocalDocumentStorage implements DocumentStorage {
  readonly kind = 'local';

  constructor(private readonly baseDir: string) {}

  get describe(): string {
    return this.baseDir;
  }

  async open(ref: StorageRef): Promise<OpenedDocument | null> {
    const extension = path.extname(ref.filePath) || '.pdf';
    const absolutePath = path.join(this.baseDir, `${ref.projectId}${extension}`);

    // `projectId` vem de uma rota, então confere que o caminho resolvido não
    // escapou do diretório base antes de tocar no disco.
    const resolvedBase = path.resolve(this.baseDir);
    if (!path.resolve(absolutePath).startsWith(resolvedBase + path.sep)) return null;

    try {
      const stat = await fs.promises.stat(absolutePath);
      if (!stat.isFile()) return null;
      return { absolutePath, sizeBytes: stat.size };
    } catch {
      return null;
    }
  }
}

/** Sem PROPOSALS_DIR configurado o painel segue de pé, só não entrega bytes. */
class UnconfiguredDocumentStorage implements DocumentStorage {
  readonly kind = 'none';
  readonly describe = 'PROPOSALS_DIR não configurado';

  async open(): Promise<OpenedDocument | null> {
    return null;
  }
}

let storage: DocumentStorage | null = null;

export function getDocumentStorage(): DocumentStorage {
  if (!storage) {
    const dir = config.proposalsDir.trim();
    storage = dir ? new LocalDocumentStorage(dir) : new UnconfiguredDocumentStorage();
  }
  return storage;
}
