import type { Request, Response } from 'express';

import { buscaSemAcento } from '../busca';
import { getCurrentDb, getPool } from '../db';
import type {
  PaginationQuery,
  Producer,
  ProducerRow,
  TotalRow,
} from '../types';
import { parsePagination } from '../utils/pagination';

function mapProducer(row: ProducerRow): Producer {
  return {
    id: row.id,
    name: row.name,
    community: row.community,
    occupation: row.occupation,
    totalProperties: row.total_propriedades,
  };
}

export async function listar(
  req: Request<object, object, object, PaginationQuery>,
  res: Response,
): Promise<Response> {
  const { page, limit, offset } = parsePagination(req.query);
  const params: string[] = [];
  let where = `WHERE pd."deletedAt" IS NULL`;
  const busca = (req.query.busca ?? '').trim();

  if (busca) {
    params.push(`%${busca}%`);
    where += ` AND ${buscaSemAcento('u.name', `$${params.length}`)}`;
  }

  const db = getPool();
  const totalQuery = await db.query<TotalRow>(
    `SELECT count(*)::int AS total
     FROM producers pd
     LEFT JOIN users u ON u.id = pd."userId"
     ${where}`,
    params,
  );
  const rowsQuery = await db.query<ProducerRow>(
    `SELECT pd.id, u.name, pd.community, pd.occupation,
            count(pr.id)::int AS total_propriedades
     FROM producers pd
     LEFT JOIN users u       ON u.id = pd."userId"
     LEFT JOIN properties pr ON pr."producerId" = pd.id
                             AND pr."deletedAt" IS NULL
     ${where}
     GROUP BY pd.id, u.name, pd.community, pd.occupation
     ORDER BY u.name NULLS LAST
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
    producers: rowsQuery.rows.map(mapProducer),
  });
}
