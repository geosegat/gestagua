import type { Request, Response } from 'express';
import type { QueryResultRow } from 'pg';

import { buscaSemAcento } from '../busca';
import { getCurrentDb, getPool } from '../db';
import { log } from '../log';

interface ProducerRow extends QueryResultRow {
  id: string;
  name: string | null;
  community: string | null;
  occupation: string | null;
  total_propriedades: number;
}

interface TotalRow extends QueryResultRow {
  total: number;
}

interface ListarQuery {
  page?: string;
  limit?: string;
  busca?: string;
}

interface Producer {
  id: string;
  name: string | null;
  community: string | null;
  occupation: string | null;
  totalProperties: number;
}

function mapProducer(row: ProducerRow): Producer {
  return {
    id: row.id,
    name: row.name,
    community: row.community,
    occupation: row.occupation,
    totalProperties: row.total_propriedades,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// GET /produtores — lista paginada
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
  } catch (error: unknown) {
    log(`ERRO GET /produtores: ${getErrorMessage(error)}`);

    return res.status(500).json({
      erro: 'erro interno',
    });
  }
}
