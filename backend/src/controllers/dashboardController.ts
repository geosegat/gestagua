import type { Request, Response } from 'express';

import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  DashboardModalityRow,
  DashboardTotalsRow,
  DashboardYearRow,
  Numeric,
  YearQuery,
} from '../types';
import { parseOptionalYear } from '../utils/validation';

const PROJECT_YEAR_SQL = `
  EXTRACT(
    YEAR FROM COALESCE(p."contractIssuanceDate"::timestamp, p."createdAt")
  )::int
`;

function number(value: Numeric): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function area(value: Numeric): number {
  return Math.round(number(value) * 100) / 100;
}

export async function summary(
  req: Request<object, object, object, YearQuery>,
  res: Response,
): Promise<Response> {
  const parsedYear = parseOptionalYear(req.query.ano);
  if (!parsedYear.valid) {
    return res.status(400).json({
      erro: 'ano invalido. Use quatro digitos entre 1900 e 2100',
    });
  }

  const db = getPool();
  const params: Array<string | number> = [config.gestaguaProgramId];
  let yearFilter = '';

  if (parsedYear.year !== null) {
    params.push(parsedYear.year);
    yearFilter = `AND ${PROJECT_YEAR_SQL} = $${params.length}`;
  }

  const [totalsQuery, modalitiesQuery, yearsQuery] = await Promise.all([
    db.query<DashboardTotalsRow>(
      `WITH active_projects AS (
         SELECT p.id, p."propertyId"
         FROM projects p
         WHERE p."programId" = $1
           AND p."deletedAt" IS NULL
           AND p.status NOT IN ('canceled', 'archived')
           ${yearFilter}
       ),
       active_properties AS (
         SELECT DISTINCT pr.id, pr."totalArea", pr."nativeVegetationArea",
                pr."totalSprings"
         FROM active_projects ap
         JOIN properties pr ON pr.id = ap."propertyId"
         WHERE pr."deletedAt" IS NULL
       )
       SELECT
         (SELECT count(*)::int FROM active_projects) AS "activeProjects",
         count(*)::int AS "activeProperties",
         coalesce(sum("totalArea"), 0) AS "totalAreaHa",
         coalesce(sum("nativeVegetationArea"), 0) AS "nativeVegetationAreaHa",
         coalesce(sum("totalSprings"), 0) AS "totalSprings"
       FROM active_properties`,
      params,
    ),
    db.query<DashboardModalityRow>(
      `WITH active_projects AS (
         SELECT p.id
         FROM projects p
         WHERE p."programId" = $1
           AND p."deletedAt" IS NULL
           AND p.status NOT IN ('canceled', 'archived')
           ${yearFilter}
       )
       SELECT
         m.id,
         m.name,
         m.code,
         count(l.id) FILTER (WHERE ap.id IS NOT NULL)::int AS "totalImplementations",
         count(DISTINCT ap.id)::int AS "totalProjects",
         coalesce(sum(l."totalArea") FILTER (WHERE ap.id IS NOT NULL), 0) AS "plannedAreaHa",
         coalesce(sum(l."realizedLandArea") FILTER (WHERE ap.id IS NOT NULL), 0) AS "executedAreaHa"
       FROM modalities m
       LEFT JOIN lands l
         ON l."modalityId" = m.id
        AND l."deletedAt" IS NULL
       LEFT JOIN active_projects ap ON ap.id = l."projectId"
       WHERE m."programId" = $1
         AND m."deletedAt" IS NULL
       GROUP BY m.id, m.name, m.code
       ORDER BY "totalImplementations" DESC, m.name`,
      params,
    ),
    db.query<DashboardYearRow>(
      `SELECT DISTINCT ${PROJECT_YEAR_SQL} AS year
       FROM projects p
       WHERE p."programId" = $1
         AND p."deletedAt" IS NULL
         AND p.status NOT IN ('canceled', 'archived')
       ORDER BY year DESC`,
      [config.gestaguaProgramId],
    ),
  ]);

  const totals = totalsQuery.rows[0];
  const modalities = modalitiesQuery.rows.map((modality) => ({
    id: modality.id,
    name: modality.name,
    code: modality.code,
    totalImplementations: modality.totalImplementations,
    totalProjects: modality.totalProjects,
    plannedAreaHa: area(modality.plannedAreaHa),
    executedAreaHa: area(modality.executedAreaHa),
  }));

  return res.json({
    program: 'Gestagua',
    dataSource: getCurrentDb(),
    filters: {
      year: parsedYear.year,
      availableYears: yearsQuery.rows.map((row) => row.year),
    },
    summary: {
      activeProjects: totals?.activeProjects ?? 0,
      activeProperties: totals?.activeProperties ?? 0,
      totalAreaHa: area(totals?.totalAreaHa ?? 0),
      nativeVegetationAreaHa: area(totals?.nativeVegetationAreaHa ?? 0),
      totalSprings: number(totals?.totalSprings ?? 0),
      totalImplementations: modalities.reduce(
        (total, modality) => total + modality.totalImplementations,
        0,
      ),
    },
    modalities,
  });
}
