import type { Request, Response } from 'express';

import { buscaSemAcento } from '../busca';
import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  PaginationQuery,
  Property,
  PropertyRow,
  TotalRow,
} from '../types';
import { parsePagination } from '../utils/pagination';

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

export async function listar(
  req: Request<object, object, object, PaginationQuery>,
  res: Response,
): Promise<Response> {
  const { page, limit, offset } = parsePagination(req.query);
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
}
