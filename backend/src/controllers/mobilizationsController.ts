import type { Request, Response } from 'express';
import type { QueryResultRow } from 'pg';

import { buscaSemAcento } from '../busca';
import { getCurrentDb, getPool } from '../db';
import { log } from '../log';

interface MobilizationRow extends QueryResultRow {
  id: string;
  local: string;
  plannedDate: string | Date | null;
  locality: string | null;
  city: string | null;
  responsible: string | null;
}

interface TotalRow extends QueryResultRow {
  total: number;
}

interface ListarQuery {
  page?: string;
  limit?: string;
  busca?: string;
}

interface Mobilization {
  id: string;
  local: string;
  plannedDate: string | Date | null;
  locality: string | null;
  city: string | null;
  responsible: string | null;
}

function mapMobilization(row: MobilizationRow): Mobilization {
  return {
    id: row.id,
    local: row.local,
    plannedDate: row.plannedDate,
    locality: row.locality,
    city: row.city,
    responsible: row.responsible,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const BASE_FROM = `
  FROM mobilizations m
  LEFT JOIN users u ON u.id = m."responsibleId"
  WHERE m."deletedAt" IS NULL
`;

// GET /mobilizacoes — lista paginada
export async function listar(
  req: Request<object, object, object, ListarQuery>,
  res: Response,
): Promise<Response> {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page ?? '', 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit ?? '', 10) || 20,
      ),
    );

    const offset = (page - 1) * limit;
    const params: string[] = [];
    let where = '';
    const busca = (req.query.busca ?? '').trim();

    if (busca) {
      params.push(`%${busca}%`);
      const placeholder = `$${params.length}`;

      where = ` AND (
        ${buscaSemAcento('m.local', placeholder)}
        OR ${buscaSemAcento('m.locality', placeholder)}
        OR ${buscaSemAcento('m.city', placeholder)}
        OR ${buscaSemAcento('u.name', placeholder)}
      )`;
    }

    const db = getPool();

    const totalQuery = await db.query<TotalRow>(
      `SELECT count(*)::int AS total ${BASE_FROM}${where}`,
      params,
    );

    const rowsQuery = await db.query<MobilizationRow>(
      `SELECT m.id, m.local, m."plannedDate", m.locality, m.city,
              u.name AS responsible
       ${BASE_FROM}${where}
       ORDER BY m."plannedDate" ASC, m.local ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const total = totalQuery.rows[0]?.total ?? 0;

    return res.json({
      program: 'Gestagua',
      dataSource: getCurrentDb(),
      pagination: {
        page,
        perPage: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      mobilizations: rowsQuery.rows.map(mapMobilization),
    });
  } catch (error: unknown) {
    log(`ERRO GET /mobilizacoes: ${getErrorMessage(error)}`);

    return res.status(500).json({
      erro: 'erro interno',
    });
  }
}
