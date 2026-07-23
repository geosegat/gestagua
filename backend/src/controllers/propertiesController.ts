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
    ruralEnvironmentalRegistry: row.ruralEnvironmentalRegistry,
    ruralEnvironmentalRegistryStatus: row.ruralEnvironmentalRegistryStatus,
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
  const params: string[] = [config.gestaguaProgramId];
  let where = `WHERE pr."deletedAt" IS NULL
    AND EXISTS (
      SELECT 1
      FROM projects scoped_project
      WHERE scoped_project."propertyId" = pr.id
        AND scoped_project."programId" = $1
        AND scoped_project."deletedAt" IS NULL
        AND scoped_project.status NOT IN ('canceled', 'archived')
    )`;
  const busca = (req.query.busca ?? '').trim();

  if (busca) {
    params.push(`%${busca}%`);
    const placeholder = `$${params.length}`;
    where +=
      ` AND (${buscaSemAcento('pr.name', placeholder)}` +
      ` OR ${buscaSemAcento('pr.community', placeholder)}` +
      ` OR ${buscaSemAcento('u.name', placeholder)}` +
      ` OR pr."ruralEnvironmentalRegistry" ILIKE ${placeholder})`;
  }

  const db = getPool();
  const totalQuery = await db.query<TotalRow>(
    `SELECT count(*)::int AS total
     FROM properties pr
     LEFT JOIN producers pd ON pd.id = pr."producerId"
     LEFT JOIN users u      ON u.id = pd."userId"
     ${where}`,
    params,
  );
  const rowsQuery = await db.query<PropertyRow>(
    `SELECT pr.id, pr.name, pr.community, pr."totalArea",
            pr."nativeVegetationArea", pr."totalSprings",
            pr."ruralEnvironmentalRegistry",
            pr."ruralEnvironmentalRegistryStatus",
            a.city, a.state, a.latitude, a.longitude,
            u.name AS producer,
            (
              SELECT count(*)::int
              FROM projects prj
              WHERE prj."propertyId" = pr.id
                AND prj."deletedAt" IS NULL
                AND prj."programId" = $1
                AND prj.status NOT IN ('canceled', 'archived')
            ) AS total_projetos
     FROM properties pr
     LEFT JOIN addresses a  ON a.id  = pr."addressId"
     LEFT JOIN producers pd ON pd.id = pr."producerId"
     LEFT JOIN users u      ON u.id  = pd."userId"
     ${where}
     ORDER BY pr.name NULLS LAST
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
    properties: rowsQuery.rows.map(mapProperty),
  });
}
