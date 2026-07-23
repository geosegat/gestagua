import type { Request, Response } from 'express';

import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  IndicatorCarbonCultureRow,
  IndicatorModalityRow,
  IndicatorPaymentsRow,
  IndicatorProjectCountRow,
  IndicatorYearRow,
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

function decimal(value: Numeric): number {
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

  const params: Array<string | number> = [config.gestaguaProgramId];
  let yearFilter = '';

  if (parsedYear.year !== null) {
    params.push(parsedYear.year);
    yearFilter = `AND ${PROJECT_YEAR_SQL} = $${params.length}`;
  }

  const activeProjectsCte = `
    WITH active_projects AS (
      SELECT p.id
      FROM projects p
      WHERE p."programId" = $1
        AND p."deletedAt" IS NULL
        AND p.status NOT IN ('canceled', 'archived')
        ${yearFilter}
    )
  `;

  const db = getPool();
  const [
    projectsQuery,
    yearsQuery,
    modalitiesQuery,
    paymentsQuery,
    carbonQuery,
  ] = await Promise.all([
    db.query<IndicatorProjectCountRow>(
      `${activeProjectsCte}
       SELECT count(*)::int AS "activeProjects"
       FROM active_projects`,
      params,
    ),
    db.query<IndicatorYearRow>(
      `SELECT DISTINCT ${PROJECT_YEAR_SQL} AS year
       FROM projects p
       WHERE p."programId" = $1
         AND p."deletedAt" IS NULL
         AND p.status NOT IN ('canceled', 'archived')
       ORDER BY year DESC`,
      [config.gestaguaProgramId],
    ),
    db.query<IndicatorModalityRow>(
      `${activeProjectsCte}
       SELECT
         m.id,
         m.name,
         m.code,
         count(l.id)::int AS implementations,
         coalesce(sum(l."totalArea"), 0) AS "plannedAreaHa",
         coalesce(sum(l."realizedLandArea"), 0) AS "restoredAreaHa",
         count(l."realizedLandArea")::int AS "restoredAreaFilled",
         coalesce(sum(l."permanentPreservationArea"), 0) AS "appPlannedAreaHa",
         count(l."permanentPreservationArea")::int AS "appAreaFilled"
       FROM modalities m
       LEFT JOIN lands l
         ON l."modalityId" = m.id
        AND l."deletedAt" IS NULL
        AND l."projectId" IN (SELECT id FROM active_projects)
       WHERE m."programId" = $1
         AND m."deletedAt" IS NULL
       GROUP BY m.id, m.name, m.code
       ORDER BY m.name`,
      params,
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
         count(i.id) FILTER (
           WHERE i."isExecuted" = true AND i."paidAt" IS NULL
         )::int AS "executedNotPaid",
         count(i.id) FILTER (
           WHERE i."paidAt" IS NOT NULL
             AND coalesce(i."isExecuted", false) = false
         )::int AS "paidNotExecuted",
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
    db.query<IndicatorCarbonCultureRow>(
      `${activeProjectsCte},
       scoped_land_cultures AS (
         SELECT lc.id, lc."cultureId", lc.area, lc.quantity
         FROM lands l
         JOIN land_cultures lc
           ON lc."landId" = l.id
          AND lc."deletedAt" IS NULL
         WHERE l."projectId" IN (SELECT id FROM active_projects)
           AND l."deletedAt" IS NULL
       ),
       productivity_catalog AS (
         SELECT
           cp."cultureId",
           count(cp.id)::int AS "productivityRows",
           count(cp."storedCarbon")::int AS "storedCarbonRows",
           count(cp.id) FILTER (WHERE cp."storedCarbon" > 0)::int
             AS "positiveStoredCarbonRows",
           min(cp."storedCarbon") AS "minimumStoredCarbon",
           max(cp."storedCarbon") AS "maximumStoredCarbon",
           coalesce(
             array_agg(DISTINCT cp.unit) FILTER (WHERE cp.unit IS NOT NULL),
             ARRAY[]::varchar[]
           ) AS units
         FROM culture_productivities cp
         WHERE cp."deletedAt" IS NULL
         GROUP BY cp."cultureId"
       )
       SELECT
         c.id,
         c.name,
         count(slc.id)::int AS "landCultures",
         coalesce(sum(slc.area), 0) AS "areaHa",
         coalesce(sum(slc.quantity), 0) AS quantity,
         coalesce(pc."productivityRows", 0)::int AS "productivityRows",
         coalesce(pc."storedCarbonRows", 0)::int AS "storedCarbonRows",
         coalesce(pc."positiveStoredCarbonRows", 0)::int
           AS "positiveStoredCarbonRows",
         pc."minimumStoredCarbon",
         pc."maximumStoredCarbon",
         coalesce(pc.units, ARRAY[]::varchar[]) AS units
       FROM scoped_land_cultures slc
       JOIN cultures c
         ON c.id = slc."cultureId"
        AND c."deletedAt" IS NULL
       LEFT JOIN productivity_catalog pc ON pc."cultureId" = c.id
       GROUP BY
         c.id,
         c.name,
         pc."productivityRows",
         pc."storedCarbonRows",
         pc."positiveStoredCarbonRows",
         pc."minimumStoredCarbon",
         pc."maximumStoredCarbon",
         pc.units
       ORDER BY c.name`,
      params,
    ),
  ]);

  const modalities = modalitiesQuery.rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    implementations: row.implementations,
    plannedAreaHa: decimal(row.plannedAreaHa),
    restoredAreaHa: decimal(row.restoredAreaHa),
    restoredAreaFilled: row.restoredAreaFilled,
    appPlannedAreaHa: decimal(row.appPlannedAreaHa),
    appAreaFilled: row.appAreaFilled,
  }));
  const totalImplementations = modalities.reduce(
    (total, modality) => total + modality.implementations,
    0,
  );

  const payment = paymentsQuery.rows[0];
  const cultures = carbonQuery.rows.map((row) => ({
    id: row.id,
    name: row.name,
    landCultures: row.landCultures,
    areaHa: decimal(row.areaHa),
    quantity: decimal(row.quantity),
    productivityRows: row.productivityRows,
    storedCarbonRows: row.storedCarbonRows,
    positiveStoredCarbonRows: row.positiveStoredCarbonRows,
    minimumStoredCarbon:
      row.minimumStoredCarbon === null ? null : decimal(row.minimumStoredCarbon),
    maximumStoredCarbon:
      row.maximumStoredCarbon === null ? null : decimal(row.maximumStoredCarbon),
    units: row.units,
  }));
  const totalLandCultures = cultures.reduce(
    (total, culture) => total + culture.landCultures,
    0,
  );
  const landCulturesWithCarbonData = cultures
    .filter((culture) => culture.storedCarbonRows > 0)
    .reduce((total, culture) => total + culture.landCultures, 0);
  const landCulturesWithPositiveCarbon = cultures
    .filter((culture) => culture.positiveStoredCarbonRows > 0)
    .reduce((total, culture) => total + culture.landCultures, 0);

  return res.json({
    program: {
      id: config.gestaguaProgramId,
      name: 'Gestagua',
    },
    dataSource: getCurrentDb(),
    filters: {
      year: parsedYear.year,
      availableYears: yearsQuery.rows.map((row) => row.year),
    },
    scope: {
      activeProjects: projectsQuery.rows[0]?.activeProjects ?? 0,
    },
    land: {
      totalImplementations,
      plannedAreaHa: decimal(
        modalities.reduce((total, modality) => total + modality.plannedAreaHa, 0),
      ),
      restoredAreaHa: decimal(
        modalities.reduce((total, modality) => total + modality.restoredAreaHa, 0),
      ),
      restoredAreaCoverage: {
        filled: modalities.reduce(
          (total, modality) => total + modality.restoredAreaFilled,
          0,
        ),
        total: totalImplementations,
      },
      appPlannedAreaHa: decimal(
        modalities.reduce((total, modality) => total + modality.appPlannedAreaHa, 0),
      ),
      appAreaCoverage: {
        filled: modalities.reduce(
          (total, modality) => total + modality.appAreaFilled,
          0,
        ),
        total: totalImplementations,
      },
      byModality: modalities,
    },
    payments: {
      totalInstallments: payment?.totalInstallments ?? 0,
      executedInstallments: payment?.executedInstallments ?? 0,
      paidInstallments: payment?.paidInstallments ?? 0,
      executedNotPaid: payment?.executedNotPaid ?? 0,
      paidNotExecuted: payment?.paidNotExecuted ?? 0,
      recordedPaidAmount: decimal(payment?.recordedPaidAmount ?? 0),
      paidAmountCoverage: {
        filled: payment?.paidAmountFilled ?? 0,
        total: payment?.paidInstallments ?? 0,
      },
    },
    carbon: {
      totalStoredCarbon: null,
      calculationStatus: 'business_rule_required',
      reason:
        'storedCarbon nao informa unidade nem se deve ser aplicado por hectare, planta ou cultura',
      coverage: {
        landCulturesWithCarbonData,
        landCulturesWithPositiveCarbon,
        totalLandCultures,
      },
      cultures,
    },
  });
}
