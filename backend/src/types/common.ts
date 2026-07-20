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
}

export interface ProjectListQuery extends PaginationQuery {
  status?: string;
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

export interface AppConfig {
  port: number;
  apiKey: string;
  gestaguaProgramId: string;
  pointerFile: string;
  logFile: string;
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
