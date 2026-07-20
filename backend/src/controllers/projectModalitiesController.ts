import type { Request, Response } from 'express';

import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  ArrangementCulture,
  ArrangementCultureRow,
  CultureResourceRow,
  CultureRow,
  IdParams,
  LandRow,
  ModalityProjectRow,
  Numeric,
  Resource,
  ResourceRow,
} from '../types';
import { UUID_RE } from '../utils/validation';

function numberOrNull(value: Numeric): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function listar(
  req: Request<IdParams>,
  res: Response,
): Promise<Response> {
    const { id } = req.params;

    if (!UUID_RE.test(id)) {
      return res.status(400).json({ erro: 'id invalido' });
    }

    const db = getPool();
    const projectQuery = await db.query<ModalityProjectRow>(
      `SELECT id
       FROM projects
       WHERE id = $1
         AND "programId" = $2
         AND "deletedAt" IS NULL`,
      [id, config.gestaguaProgramId],
    );

    if (!projectQuery.rows[0]) {
      return res.status(404).json({ erro: 'projeto nao encontrado' });
    }

    const landsQuery = await db.query<LandRow>(
      `SELECT l.id AS "landId", l."totalArea", l."realizedLandArea",
              l."previousLandUse", l."nativeVegetationArea", l.irrigation,
              l."totalSprings", l.relief, l."landType",
              m.id AS "modalityId", m.name AS "modalityName",
              m.code AS "modalityCode", m.type AS "modalityType",
              m.definition AS "modalityDefinition",
              a.id AS "arrangementId", a.name AS "arrangementName",
              a."plantingDensity"
       FROM lands l
       JOIN modalities m ON m.id = l."modalityId" AND m."deletedAt" IS NULL
       LEFT JOIN arrangements a ON a.id = l."arrangementId" AND a."deletedAt" IS NULL
       WHERE l."projectId" = $1
         AND l."deletedAt" IS NULL
       ORDER BY l."createdAt" DESC, l.id`,
      [id],
    );

    const landIds = landsQuery.rows.map((land) => land.landId);
    const arrangementIds = landsQuery.rows
      .map((land) => land.arrangementId)
      .filter((arrangementId): arrangementId is string => arrangementId !== null);

    const [culturesQuery, resourcesQuery, arrangementCulturesQuery] =
      landIds.length > 0
        ? await Promise.all([
            db.query<CultureRow>(
              `SELECT lc.id, lc."landId", c.name,
                      c.type::text AS "cultureType", c.stratum::text AS stratum,
                      c.unit, lc.type AS "supplyType", lc.quantity, lc.area,
                      lc.irrigation, lc."supplyDate", lc."spacingBetweenLines",
                      lc."spacingBetweenPlants"
               FROM land_cultures lc
               JOIN cultures c ON c.id = lc."cultureId" AND c."deletedAt" IS NULL
               WHERE lc."landId" = ANY($1::uuid[])
                 AND lc."deletedAt" IS NULL
               ORDER BY lc."landId",
                        CASE lc.type
                          WHEN 'planned_project' THEN 1
                          WHEN 'planned_producer' THEN 2
                          WHEN 'executed' THEN 3
                          ELSE 4
                        END,
                        c.name`,
              [landIds],
            ),
            db.query<ResourceRow>(
              `SELECT lr.id, lr."landId", r.name, r.category,
                      lr.type AS "supplyType", lr.quantity, lr.area,
                      lr."supplyDate", r."unitOfMeasurement", r."unitAbbreviation"
               FROM land_resources lr
               JOIN resources r ON r.id = lr."resourceId" AND r."deletedAt" IS NULL
               WHERE lr."landId" = ANY($1::uuid[])
                 AND lr."deletedAt" IS NULL
               ORDER BY lr."landId",
                        CASE lr.type
                          WHEN 'planned_project' THEN 1
                          WHEN 'planned_producer' THEN 2
                          WHEN 'executed' THEN 3
                          ELSE 4
                        END,
                        r.name`,
              [landIds],
            ),
            arrangementIds.length > 0
              ? db.query<ArrangementCultureRow>(
                  `SELECT ac.id, ac."arrangementId", ac.type,
                          c.name AS "cultureName", acl.id AS "lineId",
                          acl.name AS "lineName", acl."order" AS "lineOrder",
                          acl."verticalSpacing", acl."horizontalSpacing"
                   FROM arrangement_cultures ac
                   JOIN cultures c ON c.id = ac."cultureId" AND c."deletedAt" IS NULL
                   LEFT JOIN arrangement_culture_lines acl
                     ON acl."arrangementCultureId" = ac.id
                    AND acl."deletedAt" IS NULL
                   WHERE ac."arrangementId" = ANY($1::uuid[])
                     AND ac."deletedAt" IS NULL
                   ORDER BY ac."arrangementId", ac.type, c.name,
                            acl."order" NULLS LAST, acl.name`,
                  [arrangementIds],
                )
              : Promise.resolve({ rows: [] as ArrangementCultureRow[] }),
          ])
        : [
            { rows: [] as CultureRow[] },
            { rows: [] as ResourceRow[] },
            { rows: [] as ArrangementCultureRow[] },
          ];

    const cultureIds = culturesQuery.rows.map((culture) => culture.id);
    const cultureResourcesQuery =
      cultureIds.length > 0
        ? await db.query<CultureResourceRow>(
            `SELECT lcr.id, lcr."landCultureId", r.name, r.category,
                    lcr.quantity, r."unitOfMeasurement", r."unitAbbreviation"
             FROM land_culture_resources lcr
             JOIN resources r ON r.id = lcr."resourceId" AND r."deletedAt" IS NULL
             WHERE lcr."landCultureId" = ANY($1::uuid[])
               AND lcr."deletedAt" IS NULL
             ORDER BY lcr."landCultureId", r.name`,
            [cultureIds],
          )
        : { rows: [] as CultureResourceRow[] };

    const cultureResourcesByCulture = new Map<string, Resource[]>();
    for (const resource of cultureResourcesQuery.rows) {
      const list = cultureResourcesByCulture.get(resource.landCultureId) ?? [];
      list.push({
        id: resource.id,
        name: resource.name,
        category: resource.category,
        quantity: numberOrNull(resource.quantity),
        unitOfMeasurement: resource.unitOfMeasurement,
        unitAbbreviation: resource.unitAbbreviation,
      });
      cultureResourcesByCulture.set(resource.landCultureId, list);
    }

    const culturesByLand = new Map<string, object[]>();
    for (const culture of culturesQuery.rows) {
      const list = culturesByLand.get(culture.landId) ?? [];
      list.push({
        id: culture.id,
        name: culture.name,
        cultureType: culture.cultureType,
        stratum: culture.stratum,
        unit: culture.unit,
        supplyType: culture.supplyType,
        quantity: numberOrNull(culture.quantity),
        areaHa: numberOrNull(culture.area),
        irrigation: culture.irrigation,
        supplyDate: culture.supplyDate,
        spacingBetweenLinesM: numberOrNull(culture.spacingBetweenLines),
        spacingBetweenPlantsM: numberOrNull(culture.spacingBetweenPlants),
        resources: cultureResourcesByCulture.get(culture.id) ?? [],
      });
      culturesByLand.set(culture.landId, list);
    }

    const resourcesByLand = new Map<string, object[]>();
    for (const resource of resourcesQuery.rows) {
      const list = resourcesByLand.get(resource.landId) ?? [];
      list.push({
        id: resource.id,
        name: resource.name,
        category: resource.category,
        supplyType: resource.supplyType,
        quantity: numberOrNull(resource.quantity),
        areaHa: numberOrNull(resource.area),
        supplyDate: resource.supplyDate,
        unitOfMeasurement: resource.unitOfMeasurement,
        unitAbbreviation: resource.unitAbbreviation,
      });
      resourcesByLand.set(resource.landId, list);
    }

    const arrangementCulturesByArrangement = new Map<
      string,
      Map<string, ArrangementCulture>
    >();
    for (const row of arrangementCulturesQuery.rows) {
      const cultures =
        arrangementCulturesByArrangement.get(row.arrangementId) ?? new Map();
      const culture = cultures.get(row.id) ?? {
        id: row.id,
        name: row.cultureName,
        type: row.type,
        lines: [],
      };

      if (row.lineId) {
        culture.lines.push({
          id: row.lineId,
          name: row.lineName,
          order: row.lineOrder,
          verticalSpacing: numberOrNull(row.verticalSpacing),
          horizontalSpacing: numberOrNull(row.horizontalSpacing),
        });
      }

      cultures.set(row.id, culture);
      arrangementCulturesByArrangement.set(row.arrangementId, cultures);
    }

    const modalities = landsQuery.rows.map((land) => ({
      id: land.landId,
      modality: {
        id: land.modalityId,
        name: land.modalityName,
        code: land.modalityCode,
        type: land.modalityType,
        definition: land.modalityDefinition,
      },
      areaHa: numberOrNull(land.totalArea),
      executedAreaHa: numberOrNull(land.realizedLandArea),
      previousLandUse: land.previousLandUse,
      nativeVegetationAreaHa: numberOrNull(land.nativeVegetationArea),
      irrigation: land.irrigation,
      totalSprings: land.totalSprings,
      relief: land.relief,
      landType: land.landType,
      arrangement: land.arrangementId
        ? {
            id: land.arrangementId,
            name: land.arrangementName,
            plantingDensity: numberOrNull(land.plantingDensity),
            cultures: [
              ...(arrangementCulturesByArrangement.get(land.arrangementId)?.values() ?? []),
            ],
          }
        : null,
      cultures: culturesByLand.get(land.landId) ?? [],
      resources: resourcesByLand.get(land.landId) ?? [],
    }));

    const sumOrNull = (values: Array<number | null>): number | null =>
      values.some((value) => value !== null)
        ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
        : null;

    return res.json({
      projectId: id,
      dataSource: getCurrentDb(),
      summary: {
        totalImplantations: modalities.length,
        plannedAreaHa: sumOrNull(modalities.map((item) => item.areaHa)),
        executedAreaHa: sumOrNull(
          modalities.map((item) => item.executedAreaHa),
        ),
        totalCultures: culturesQuery.rows.length,
        totalResources:
          resourcesQuery.rows.length + cultureResourcesQuery.rows.length,
      },
      modalities,
    });
}
