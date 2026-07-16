import type { Request, Response } from 'express';
import type { QueryResultRow } from 'pg';

import { buscaSemAcento } from '../busca';
import { getCurrentDb, getPool } from '../db';
import { log } from '../log';

interface ProgramRow extends QueryResultRow {
  id: string;
  name: string;
  proponentName: string | null;
  proponentUrl: string | null;
  duration: number | null;
}

interface TotalRow extends QueryResultRow {
  total: number;
}

interface ListQuery {
  page?: string;
  limit?: string;
  search?: string;
}

interface Program {
  id: string;
  name: string;
  proponentName: string | null;
  proponentUrl: string | null;
  duration: number | null;
}

function mapProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    proponentName: row.proponentName || null,
    proponentUrl: row.proponentUrl || null,
    duration: row.duration,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const BASE_FROM = `
  FROM programs p
  WHERE p."deletedAt" IS NULL
`;

export async function list(
  req: Request<object, object, object, ListQuery>,
  res: Response,
): Promise<Response> {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page ?? '', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit ?? '', 10) || 20),
    );
    const offset = (page - 1) * limit;
    const params: string[] = [];
    let where = '';
    const search = (req.query.search ?? '').trim();

    if (search) {
      params.push(`%${search}%`);
      const placeholder = `$${params.length}`;
      where = ` AND (
        ${buscaSemAcento('p.name', placeholder)}
        OR ${buscaSemAcento('p."proponentName"', placeholder)}
      )`;
    }

    const db = getPool();
    const totalQuery = await db.query<TotalRow>(
      `SELECT count(*)::int AS total ${BASE_FROM}${where}`,
      params,
    );
    const rowsQuery = await db.query<ProgramRow>(
      `SELECT p.id, p.name, p."proponentName", p."proponentUrl", p.duration
       ${BASE_FROM}${where}
       ORDER BY p.name ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const total = totalQuery.rows[0]?.total ?? 0;

    return res.json({
      dataSource: getCurrentDb(),
      pagination: {
        page,
        perPage: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      programs: rowsQuery.rows.map(mapProgram),
    });
  } catch (error: unknown) {
    log(`ERROR GET /programs: ${getErrorMessage(error)}`);
    return res.status(500).json({ error: 'internal error' });
  }
}
