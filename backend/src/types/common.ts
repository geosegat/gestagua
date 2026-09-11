import type { QueryResultRow } from 'pg';
import type { NextFunction, Request, Response } from 'express';

export type Numeric = number | string | null;

export interface TotalRow extends QueryResultRow {
  total: number;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  busca?: string;
  ano?: string;
}

export interface ProjectListQuery extends PaginationQuery {
  status?: string;
}

export interface YearQuery {
  ano?: string;
}

export interface ProgramListQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export interface IdParams {
  id: string;
}

export interface StageParams extends IdParams {
  stageId: string;
}

export interface DatabaseConfig {
  connectionString: string;
  host: string;
  port: number;
  user: string;
  password: string;
}

/** Bucket S3-compatible das propostas. Vazio = adapter de R2 desligado. */
export interface R2Config {
  endpoint: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface ProposalsConfig {
  /** Diretório local dos PDFs; usado só quando o R2 não está configurado. */
  proposalsDir: string;
  r2: R2Config;
}

export interface AppConfig {
  port: number;
  apiKey: string;
  /** Chave do painel interno: exigida nas rotas que servem dado pessoal. */
  internalApiKey: string;
  allowedOrigins: string[];
  gestaguaProgramId: string;
  pointerFile: string;
  logFile: string;
  syncStateFile: string;
  proposals: ProposalsConfig;
  db: DatabaseConfig;
}

export interface PaginationInput {
  page?: string;
  limit?: string;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

export type AsyncController = (
  req: Request<any, any, any, any>,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;
