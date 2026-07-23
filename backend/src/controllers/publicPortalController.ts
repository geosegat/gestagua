import type { Request, Response } from 'express';

import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  DashboardModalityRow,
  DashboardTotalsRow,
  DashboardYearRow,
  IndicatorPaymentsRow,
  Numeric,
  PublicCommunityRow,
  PublicEvolutionRow,
  PublicRestorationRow,
  YearQuery,
} from '../types';
import { parseOptionalYear } from '../utils/validation';

/**
 * Portal público de resultados: TUDO que sai daqui é agregado e curado.
 * Nome de produtor, CAR e coordenada NÃO entram - se um dado novo precisar
 * aparecer no portal, ele é adicionado aqui de forma explícita, nunca
 * reaproveitando as rotas autenticadas do painel interno.
 */

const PROJECT_YEAR_SQL = `
  EXTRACT(
    YEAR FROM COALESCE(p."contractIssuanceDate"::timestamp, p."createdAt")
  )::int
`;

/**
 * A rota é aberta e o espelho é compartilhado com o painel interno, então cada
 * resposta fica cacheada por ano. O TTL curto mantém o portal "sempre
 * atualizado" na prática (o espelho muda uma vez por dia).
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { expires: number; payload: unknown }>();

function number(value: Numeric): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function area(value: Numeric): number {
  return Math.round(number(value) * 100) / 100;
}

export async function portal(
  req: Request<object, object, object, YearQuery>,
  res: Response,
): Promise<Response> {
  const parsedYear = parseOptionalYear(req.query.ano);
  if (!parsedYear.valid) {
    return res.status(400).json({
      erro: 'ano invalido. Use quatro digitos entre 1900 e 2100',
    });
  }

  const cacheKey = `${parsedYear.year ?? 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return res.json(cached.payload);
  }

  const db = getPool();
  const params: Array<string | number> = [config.gestaguaProgramId];
  let yearFilter = '';

  if (parsedYear.year !== null) {
    params.push(parsedYear.year);
    yearFilter = `AND ${PROJECT_YEAR_SQL} = $${params.length}`;
  }

  const activeProjectsCte = `
    WITH active_projects AS (
      SELECT p.id, p."propertyId"
      FROM projects p
      WHERE p."programId" = $1
        AND p."deletedAt" IS NULL
        AND p.status NOT IN ('canceled', 'archived')
        ${yearFilter}
    )
  `;

  const [
    totalsQuery,
    modalitiesQuery,
    yearsQuery,
    paymentsQuery,
    restorationQuery,
    communitiesQuery,
    evolutionQuery,
  ] = await Promise.all([
    db.query<DashboardTotalsRow>(
      `${activeProjectsCte},
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
      `${activeProjectsCte}
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
    db.query<IndicatorPaymentsRow>(
      `${activeProjectsCte},
       scoped_entities AS (
         SELECT id FROM active_projects
         UNION
         SELECT l.id
         FROM lands l
         WHERE l."projectId" IN (SELECT id FROM active_projects)
           AND l."deletedAt" IS NULL
       )
       SELECT
         count(i.id)::int AS "totalInstallments",
         count(i.id) FILTER (WHERE i."isExecuted" = true)::int
           AS "executedInstallments",
         count(i.id) FILTER (WHERE i."paidAt" IS NOT NULL)::int
           AS "paidInstallments",
         0::int AS "executedNotPaid",
         0::int AS "paidNotExecuted",
         coalesce(sum(i."paidAmount") FILTER (WHERE i."paidAt" IS NOT NULL), 0)
           AS "recordedPaidAmount",
         count(i."paidAmount") FILTER (WHERE i."paidAt" IS NOT NULL)::int
           AS "paidAmountFilled"
       FROM installments i
       WHERE i."entityId" IN (SELECT id FROM scoped_entities)
         AND i.type = 'producer'
         AND i."parentId" IS NULL
         AND i."deletedAt" IS NULL`,
      params,
    ),
    db.query<PublicRestorationRow>(
      `${activeProjectsCte}
       SELECT
         coalesce(sum(l."totalArea"), 0) AS "plannedAreaHa",
         coalesce(sum(l."realizedLandArea"), 0) AS "restoredAreaHa",
         coalesce(sum(l."permanentPreservationArea"), 0) AS "appAreaHa"
       FROM lands l
       WHERE l."projectId" IN (SELECT id FROM active_projects)
         AND l."deletedAt" IS NULL`,
      params,
    ),
    db.query<PublicCommunityRow>(
      `${activeProjectsCte},
       scoped AS (
         SELECT
           ap.id AS project_id,
           pr.id AS property_id,
           CASE
             WHEN pr.community IS NULL
               OR lower(trim(pr.community))
                 IN ('', 'não aplicável', 'nao aplicavel', 'n/a', 'na')
             THEN 'Comunidade não informada'
             ELSE trim(pr.community)
           END AS community,
           pr."totalArea",
           pr."nativeVegetationArea",
           pr."totalSprings"
         FROM active_projects ap
         JOIN properties pr ON pr.id = ap."propertyId"
         WHERE pr."deletedAt" IS NULL
       ),
       property_totals AS (
         SELECT DISTINCT ON (property_id)
           community, property_id, "totalArea", "nativeVegetationArea",
           "totalSprings"
         FROM scoped
       )
       SELECT
         pt.community,
         count(*)::int AS properties,
         (
           SELECT count(DISTINCT s.project_id)::int
           FROM scoped s
           WHERE s.community = pt.community
         ) AS projects,
         coalesce(sum(pt."totalArea"), 0) AS "totalAreaHa",
         coalesce(sum(pt."nativeVegetationArea"), 0) AS "nativeVegetationAreaHa",
         coalesce(sum(pt."totalSprings"), 0) AS "totalSprings"
       FROM property_totals pt
       GROUP BY pt.community
       ORDER BY "totalAreaHa" DESC, pt.community`,
      params,
    ),
    // evolução ignora o filtro de ano de propósito: é a série histórica inteira
    db.query<PublicEvolutionRow>(
      `SELECT ${PROJECT_YEAR_SQL} AS year, count(*)::int AS projects
       FROM projects p
       WHERE p."programId" = $1
         AND p."deletedAt" IS NULL
         AND p.status NOT IN ('canceled', 'archived')
       GROUP BY 1
       ORDER BY 1`,
      [config.gestaguaProgramId],
    ),
  ]);

  const totals = totalsQuery.rows[0];
  const payments = paymentsQuery.rows[0];
  const restoration = restorationQuery.rows[0];
  const modalities = modalitiesQuery.rows.map((modality) => ({
    id: modality.id,
    name: modality.name,
    code: modality.code,
    totalImplementations: modality.totalImplementations,
    totalProjects: modality.totalProjects,
    plannedAreaHa: area(modality.plannedAreaHa),
    executedAreaHa: area(modality.executedAreaHa),
  }));

  const payload = {
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
    finance: {
      totalInstallments: payments?.totalInstallments ?? 0,
      executedInstallments: payments?.executedInstallments ?? 0,
      paidInstallments: payments?.paidInstallments ?? 0,
      recordedPaidAmount: area(payments?.recordedPaidAmount ?? 0),
    },
    restoration: {
      plannedAreaHa: area(restoration?.plannedAreaHa ?? 0),
      restoredAreaHa: area(restoration?.restoredAreaHa ?? 0),
      appAreaHa: area(restoration?.appAreaHa ?? 0),
    },
    modalities,
    communities: communitiesQuery.rows.map((row) => ({
      name: row.community,
      properties: row.properties,
      projects: row.projects,
      totalAreaHa: area(row.totalAreaHa),
      nativeVegetationAreaHa: area(row.nativeVegetationAreaHa),
      totalSprings: number(row.totalSprings),
    })),
    evolution: evolutionQuery.rows.map((row) => ({
      year: row.year,
      projects: row.projects,
    })),
  };

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload });
  return res.json(payload);
}
