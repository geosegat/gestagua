import type { Request, Response } from 'express';

import { buscaSemAcento } from '../busca';
import { getCurrentDb, getPool } from '../db';
import type {
  Program,
  ProgramListQuery,
  ProgramRow,
  TotalRow,
} from '../types';
import { parsePagination } from '../utils/pagination';

const BASE_FROM = `
  FROM programs p
  WHERE p."deletedAt" IS NULL
`;

function mapProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    proponentName: row.proponentName || null,
    proponentUrl: row.proponentUrl || null,
    duration: row.duration,
  };
}

export async function list(
  req: Request<object, object, object, ProgramListQuery>,
  res: Response,
): Promise<Response> {
  const { page, limit, offset } = parsePagination(req.query);
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
}
