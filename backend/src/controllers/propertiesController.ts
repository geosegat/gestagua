import type { Request, Response } from 'express';

import { buscaSemAcento } from '../busca';
import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  Numeric,
  PaginationQuery,
  Property,
  PropertyModalityRow,
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
    propertyCode: row.propertyCode,
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
      ` OR pr."propertyCode" ILIKE ${placeholder}` +
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
            pr."propertyCode",
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

/** Formato canônico do CAR (UF-IBGE-HASH); sufixos do SICAR são ignorados. */
const CAR_RE = /^([A-Z]{2}-\d{7}-[A-F0-9]{32})/i;

function numberOrNull(value: Numeric): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * O que o programa sabe sobre um código CAR: a propriedade vinculada (se
 * houver) e as modalidades implantadas nela. Os dados cadastrais do imóvel
 * (área, módulos fiscais, status, situação) vêm do SICAR pelo geo-api - aqui só
 * mora o vínculo com o Gestágua.
 *
 * Sempre 200: um CAR que existe no SICAR mas não está no programa devolve
 * `linked: false`, e a tela mostra o card do imóvel com o aviso de sem vínculo.
 */
export async function porCar(
  req: Request<{ codigo: string }>,
  res: Response,
): Promise<Response> {
  const match = (req.params.codigo ?? '').trim().match(CAR_RE);

  if (!match) {
    return res.status(400).json({ erro: 'codigo CAR invalido' });
  }

  const car = match[1].toUpperCase();
  const db = getPool();
  const propertyQuery = await db.query<PropertyRow>(
    `SELECT pr.id, pr.name, pr.community, pr."totalArea",
            pr."nativeVegetationArea", pr."totalSprings",
            pr."propertyCode",
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
     WHERE pr."deletedAt" IS NULL
       AND (pr."propertyCode" ILIKE $2 || '%'
            OR pr."ruralEnvironmentalRegistry" ILIKE $2 || '%')
       AND EXISTS (
         SELECT 1
         FROM projects scoped_project
         WHERE scoped_project."propertyId" = pr.id
           AND scoped_project."programId" = $1
           AND scoped_project."deletedAt" IS NULL
           AND scoped_project.status NOT IN ('canceled', 'archived')
       )
     ORDER BY pr.name NULLS LAST
     LIMIT 1`,
    [config.gestaguaProgramId, car],
  );

  const row = propertyQuery.rows[0];

  if (!row) {
    return res.json({
      car,
      dataSource: getCurrentDb(),
      linked: false,
      property: null,
      modalities: [],
    });
  }

  // uma linha por modalidade: a propriedade pode ter várias implantações da
  // mesma modalidade, em projetos diferentes
  const modalitiesQuery = await db.query<PropertyModalityRow>(
    `SELECT m.id AS "modalityId", m.name, m.code, m.type,
            count(*)::int AS total_implantacoes,
            sum(l."totalArea") AS "plannedArea",
            sum(l."realizedLandArea") AS "executedArea"
     FROM lands l
     JOIN projects prj ON prj.id = l."projectId"
       AND prj."deletedAt" IS NULL
       AND prj."programId" = $1
       AND prj.status NOT IN ('canceled', 'archived')
     JOIN modalities m ON m.id = l."modalityId" AND m."deletedAt" IS NULL
     WHERE prj."propertyId" = $2
       AND l."deletedAt" IS NULL
     GROUP BY m.id, m.name, m.code, m.type
     ORDER BY m.name`,
    [config.gestaguaProgramId, row.id],
  );

  return res.json({
    car,
    dataSource: getCurrentDb(),
    linked: true,
    property: mapProperty(row),
    modalities: modalitiesQuery.rows.map((modality) => ({
      id: modality.modalityId,
      name: modality.name,
      code: modality.code,
      type: modality.type,
      totalImplantations: modality.total_implantacoes,
      plannedAreaHa: numberOrNull(modality.plannedArea),
      executedAreaHa: numberOrNull(modality.executedArea),
    })),
  });
}
