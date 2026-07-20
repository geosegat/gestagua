import type { Request, Response } from 'express';

import { buscaSemAcento } from '../busca';
import { getCurrentDb, getPool } from '../db';
import type {
  Mobilization,
  MobilizationRow,
  PaginationQuery,
  TotalRow,
} from '../types';
import { parsePagination } from '../utils/pagination';

const BASE_FROM = `
  FROM mobilizations m
  LEFT JOIN users u ON u.id = m."responsibleId"
  WHERE m."deletedAt" IS NULL
`;

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

export async function listar(
  req: Request<object, object, object, PaginationQuery>,
  res: Response,
): Promise<Response> {
  const { page, limit, offset } = parsePagination(req.query);
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
}
