/**
 * Último metro da entrega de documentos.
 *
 * O banco do painel é um espelho do MV Gest: ele traz o *metadado* do documento
 * (nome, tamanho, `filePath`), mas o sync (`scripts/sync-worker.ps1`) carrega só
 * o Postgres, não os blobs. Então quem serve os bytes é decisão de ambiente, e
 * fica isolada aqui atrás de uma interface.
 *
 * Adapters, em ordem de precedência:
 *   r2     bucket S3-compatible (produção: a API roda no Railway, cujo disco é
 *          efêmero — arquivo em disco não sobrevive a deploy)
 *   local  diretório apontado por PROPOSALS_DIR, arquivos nomeados pelo id do
 *          projeto (desenvolvimento; ver scripts/seed-propostas.js)
 *   none   nada configurado: a aba aparece e o download fica desabilitado
 *
 * A chave é sempre derivada do `projectId`, não do nome do produtor, que
 * diverge entre as fontes. Um adapter futuro que leia direto do storage do
 * MV Gest usaria `ref.filePath` — por isso os dois viajam no StorageRef.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';

import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import config from '../config';
import { log } from '../log';

export interface StorageRef {
  /** Chave dos adapters que organizam por projeto (local, r2). */
  projectId: string;
  /** Caminho canônico do MV Gest — a chave de um adapter que leia a origem. */
  filePath: string;
}

export interface DocumentHead {
  sizeBytes: number;
}

export interface OpenedDocument {
  stream: Readable;
  sizeBytes: number;
}

export interface DocumentStorage {
  readonly kind: string;
  /** Descreve o destino para diagnóstico, sem vazar credencial. */
  readonly describe: string;
  /** Nome do erro da última falha, quando o adapter souber informar. */
  readonly lastError?: string | null;
  /** Só confere existência e tamanho — não transfere o corpo. */
  head(ref: StorageRef): Promise<DocumentHead | null>;
  open(ref: StorageRef): Promise<OpenedDocument | null>;
}

/** Extensão vinda do caminho canônico, com .pdf como piso. */
function extensionOf(ref: StorageRef): string {
  return path.extname(ref.filePath).toLowerCase() || '.pdf';
}

/**
 * Lê de um diretório local. Resolução exata pelo id do projeto: casar nome de
 * produtor em tempo de requisição é o que quebra com acento e grafia divergente.
 */
class LocalDocumentStorage implements DocumentStorage {
  readonly kind = 'local';

  constructor(private readonly baseDir: string) {}

  get describe(): string {
    return this.baseDir;
  }

  /** `projectId` vem da rota: confere que o caminho não escapou do diretório. */
  private resolve(ref: StorageRef): string | null {
    const absolute = path.join(this.baseDir, `${ref.projectId}${extensionOf(ref)}`);
    const base = path.resolve(this.baseDir);
    return path.resolve(absolute).startsWith(base + path.sep) ? absolute : null;
  }

  async head(ref: StorageRef): Promise<DocumentHead | null> {
    const absolute = this.resolve(ref);
    if (!absolute) return null;

    try {
      const stat = await fs.promises.stat(absolute);
      return stat.isFile() ? { sizeBytes: stat.size } : null;
    } catch {
      return null;
    }
  }

  async open(ref: StorageRef): Promise<OpenedDocument | null> {
    const absolute = this.resolve(ref);
    if (!absolute) return null;

    const found = await this.head(ref);
    if (!found) return null;

    return { stream: fs.createReadStream(absolute), sizeBytes: found.sizeBytes };
  }
}

/**
 * Bucket S3-compatible (Cloudflare R2). O objeto é lido pela API e repassado ao
 * navegador em vez de entregue por presigned URL: assim o bucket continua
 * privado e o controle de acesso segue sendo o `x-api-key` do painel, sem URL
 * assinada circulando em log, histórico e print de tela.
 */
class S3DocumentStorage implements DocumentStorage {
  readonly kind = 'r2';

  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    private readonly prefix: string,
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  get describe(): string {
    return `bucket ${this.bucket}${this.prefix ? `/${this.prefix}` : ''}`;
  }

  private keyFor(ref: StorageRef): string {
    const name = `${ref.projectId}${extensionOf(ref)}`;
    return this.prefix ? `${this.prefix}/${name}` : name;
  }

  /**
   * Guarda por que a última chamada falhou. Sem isso, "indisponível" cobre
   * credencial errada, bucket errado e objeto ausente com a mesma mensagem, e
   * diagnosticar em produção vira adivinhação.
   */
  private ultimoErro: string | null = null;

  get lastError(): string | null {
    return this.ultimoErro;
  }

  /**
   * Registra nome + status HTTP. O status importa porque HeadObject é um HTTP
   * HEAD, sem corpo: o SDK não consegue parsear o código do erro e devolve
   * "Unknown". Já o status separa os casos que interessam — 401/403 é
   * credencial ou permissão, 404 é objeto ausente.
   */
  private registrar(operacao: string, erro: unknown): null {
    const nome = erro instanceof Error ? erro.name : 'ErroDesconhecido';
    const status = (erro as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;

    this.ultimoErro = status ? `${nome} (HTTP ${status})` : nome;
    log(`R2 ${operacao} falhou em ${this.bucket}: ${this.ultimoErro}`);
    return null;
  }

  async head(ref: StorageRef): Promise<DocumentHead | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.keyFor(ref) }),
      );
      this.ultimoErro = null;
      return { sizeBytes: result.ContentLength ?? 0 };
    } catch (erro) {
      return this.registrar('HeadObject', erro);
    }
  }

  async open(ref: StorageRef): Promise<OpenedDocument | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.keyFor(ref) }),
      );
      if (!result.Body) return this.registrar('GetObject', new Error('SemCorpo'));

      this.ultimoErro = null;
      return {
        stream: result.Body as Readable,
        sizeBytes: result.ContentLength ?? 0,
      };
    } catch (erro) {
      return this.registrar('GetObject', erro);
    }
  }
}

/** Sem storage configurado o painel segue de pé, só não entrega bytes. */
class UnconfiguredDocumentStorage implements DocumentStorage {
  readonly kind = 'none';
  readonly describe = 'nenhum storage de propostas configurado';

  async head(): Promise<DocumentHead | null> {
    return null;
  }

  async open(): Promise<OpenedDocument | null> {
    return null;
  }
}

function build(): DocumentStorage {
  const { r2, proposalsDir } = config.proposals;

  if (r2.bucket && r2.endpoint && r2.accessKeyId && r2.secretAccessKey) {
    return new S3DocumentStorage(
      r2.bucket,
      r2.prefix,
      r2.endpoint,
      r2.accessKeyId,
      r2.secretAccessKey,
    );
  }

  if (proposalsDir) return new LocalDocumentStorage(proposalsDir);

  return new UnconfiguredDocumentStorage();
}

let storage: DocumentStorage | null = null;

export function getDocumentStorage(): DocumentStorage {
  if (!storage) storage = build();
  return storage;
}
