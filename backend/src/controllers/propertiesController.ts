import type { Request, Response } from 'express';
import type { QueryResultRow } from 'pg';

import { buscaSemAcento } from '../busca';
import config from '../config';
import { getCurrentDb, getPool } from '../db';
import { log } from '../log';

interface PropertyRow extends QueryResultRow {
  id: string;
  name: string | null;
  community: string | null;
  producer: string | null;
  totalArea: number | string | null;
  nativeVegetationArea: number | string | null;
  totalSprings: number | null;
  total_projetos: number;
  city: string | null;
  state: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

interface TotalRow extends QueryResultRow {
  total: number;
}

interface ListarQuery {
  page?: string;
  limit?: string;
  busca?: string;
}

interface Property {
  id: string;
  name: string | null;
  community: string | null;
  producer: string | null;
  totalAreaHa: number | string | null;
  nativeVegetationAreaHa: number | string | null;
  totalSprings: number | null;
  totalProjects: number;
  location: {
    municipality: string | null;
    state: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
  };
}

function mapProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    community: row.community,
    producer: row.producer,
    totalAreaHa: row.totalArea,
    nativeVegetationAreaHa: row.nativeVegetationArea,
    totalSprings: row.totalSprings,
    totalProjects: row.total_projetos,
    location: {
      municipality: row.city,
      state: row.state,
      latitude: row.latitude,
      longitude: row.longitude,
    },
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// GET /propriedades — lista paginada
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

    const filterParams: string[] = [];
    let where = `WHERE pr."deletedAt" IS NULL`;

    const busca = (req.query.busca ?? '').trim();

    if (busca) {
      filterParams.push(`%${busca}%`);
      where +=
        ` AND (${buscaSemAcento('pr.name', '$1')}` +
        ` OR ${buscaSemAcento('pr.community', '$1')}` +
        ` OR ${buscaSemAcento('u.name', '$1')})`;
    }

    const db = getPool();

    const totalQuery = await db.query<TotalRow>(
      `SELECT count(*)::int AS total
       FROM properties pr
       LEFT JOIN producers pd ON pd.id = pr."producerId"
       LEFT JOIN users u      ON u.id = pd."userId"
       ${where}`,
      filterParams,
    );

    const programParamIndex = filterParams.length + 1;
    const rowsParams = [...filterParams, config.gestaguaProgramId];

    const rowsQuery = await db.query<PropertyRow>(
      `SELECT pr.id, pr.name, pr.community, pr."totalArea",
              pr."nativeVegetationArea", pr."totalSprings",
              a.city, a.state, a.latitude, a.longitude,
              u.name AS producer,
              (
                SELECT count(*)::int
                FROM projects prj
                WHERE prj."propertyId" = pr.id
                  AND prj."deletedAt" IS NULL
                  AND prj."programId" = $${programParamIndex}
              ) AS total_projetos
       FROM properties pr
       LEFT JOIN addresses a  ON a.id  = pr."addressId"
       LEFT JOIN producers pd ON pd.id = pr."producerId"
       LEFT JOIN users u      ON u.id  = pd."userId"
       ${where}
       ORDER BY pr.name NULLS LAST
       LIMIT ${limit} OFFSET ${offset}`,
      rowsParams,
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
      properties: rowsQuery.rows.map(mapProperty),
    });
  } catch (error: unknown) {
    log(`ERRO GET /propriedades: ${getErrorMessage(error)}`);

    return res.status(500).json({
      erro: 'erro interno',
    });
  }
}
