import type { Request, Response } from 'express';

import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  IdParams,
  InstallmentProjectRow,
  LandFinancialRow,
  Numeric,
  ProducerInstallmentRow,
} from '../types';
import { UUID_RE } from '../utils/validation';

const SHORT_TERM_RATES = [0.5, 0.3, 0.2, 0, 0];
const LONG_TERM_RATE = 0.2;

function number(value: Numeric): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function parseSetting(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number): number {
  return Number(value.toFixed(2));
}

function dateValue(value: string | Date): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function buildView(
  id: string,
  kind: 'project' | 'modality',
  label: string,
  rows: ProducerInstallmentRow[],
  shortTermTotal: number,
  longTermTotal: number,
  modality: { id: string; name: string; areaHa: number | null } | null,
) {
  const ordered = [...rows].sort(
    (left, right) =>
      left.order - right.order || dateValue(left.expectedDate) - dateValue(right.expectedDate),
  );

  const installments = ordered.length < 5
    ? []
    : ordered.map((row, index) => {
        const shortTermAmount = money(
          shortTermTotal * (SHORT_TERM_RATES[index] ?? 0),
        );
        const longTermAmount = money(index < 5 ? longTermTotal * LONG_TERM_RATE : 0);
        const totalAmount = money(shortTermAmount + longTermAmount);
        const paidAmount = row.paidAt
          ? money(row.paidAmount === null ? totalAmount : number(row.paidAmount))
          : 0;

        return {
          id: row.id,
          order: row.order,
          name: row.name,
          expectedDate: row.expectedDate,
          recalculatedDate: row.recalculatedDate,
          paidAt: row.paidAt,
          shortTermAmount,
          longTermAmount,
          totalAmount,
          paidAmount,
        };
      });

  const totalAmount = money(
    installments.reduce((total, installment) => total + installment.totalAmount, 0),
  );
  const paidAmount = money(
    installments.reduce((total, installment) => total + installment.paidAmount, 0),
  );
  const paidInstallments = installments.filter((installment) => installment.paidAt).length;
  const pending = installments
    .filter((installment) => !installment.paidAt)
    .sort(
      (left, right) =>
        dateValue(left.recalculatedDate ?? left.expectedDate) -
        dateValue(right.recalculatedDate ?? right.expectedDate),
    );

  return {
    id,
    kind,
    label,
    modality,
    summary: {
      shortTermAmount: money(
        installments.reduce(
          (total, installment) => total + installment.shortTermAmount,
          0,
        ),
      ),
      longTermAmount: money(
        installments.reduce(
          (total, installment) => total + installment.longTermAmount,
          0,
        ),
      ),
      totalAmount,
      paidAmount,
      pendingAmount: money(Math.max(0, totalAmount - paidAmount)),
      paidPercentage:
        totalAmount > 0 ? Math.min(100, money((paidAmount / totalAmount) * 100)) : 0,
      totalInstallments: installments.length,
      paidInstallments,
      nextExpectedDate: pending[0]?.recalculatedDate ?? pending[0]?.expectedDate ?? null,
    },
    installments,
  };
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
  const projectQuery = await db.query<InstallmentProjectRow>(
    `SELECT p.id,
            (
              SELECT gs.value
              FROM general_settings gs
              WHERE gs."projectId" = p.id
                AND gs.key = 'VRTE'
                AND gs."deletedAt" IS NULL
              ORDER BY gs.year DESC, gs."createdAt" DESC
              LIMIT 1
            ) AS "vrteValue"
     FROM projects p
     WHERE p.id = $1
       AND p."programId" = $2
       AND p."deletedAt" IS NULL`,
    [id, config.gestaguaProgramId],
  );

  const project = projectQuery.rows[0];
  if (!project) {
    return res.status(404).json({ erro: 'projeto nao encontrado' });
  }

  const landsQuery = await db.query<LandFinancialRow>(
    `SELECT l.id, l."totalArea",
            m.id AS "modalityId", m.name AS "modalityName",
            COALESCE(cultures.value, 0) + COALESCE(resources.value, 0)
              AS "plannedProjectVrte",
            COALESCE(m."vrteLongTerm", 0) * 5 * COALESCE(l."totalArea", 0)
              AS "longTermVrte"
     FROM lands l
     JOIN modalities m
       ON m.id = l."modalityId"
      AND m."deletedAt" IS NULL
     LEFT JOIN LATERAL (
       SELECT SUM(COALESCE(lcr.quantity, 0) * COALESCE(rate."vrteValue", 0)) AS value
       FROM land_cultures lc
       JOIN land_culture_resources lcr
         ON lcr."landCultureId" = lc.id
        AND lcr."deletedAt" IS NULL
       LEFT JOIN LATERAL (
         SELECT cr."vrteValue"
         FROM culture_resources cr
         WHERE cr."resourceId" = lcr."resourceId"
           AND cr."deletedAt" IS NULL
         ORDER BY cr."createdAt", cr.id
         LIMIT 1
       ) rate ON TRUE
       WHERE lc."landId" = l.id
         AND lc.type = 'planned_project'
         AND lc."deletedAt" IS NULL
     ) cultures ON TRUE
     LEFT JOIN LATERAL (
       SELECT SUM(COALESCE(lr.quantity, 0) * COALESCE(rate."vrteShortTerm", 0)) AS value
       FROM land_resources lr
       LEFT JOIN LATERAL (
         SELECT mr."vrteShortTerm"
         FROM modality_resources mr
         WHERE mr."modalityId" = l."modalityId"
           AND mr."resourceId" = lr."resourceId"
           AND mr."deletedAt" IS NULL
         ORDER BY mr."createdAt", mr.id
         LIMIT 1
       ) rate ON TRUE
       WHERE lr."landId" = l.id
         AND lr.type = 'planned_project'
         AND lr."deletedAt" IS NULL
     ) resources ON TRUE
     WHERE l."projectId" = $1
       AND l."deletedAt" IS NULL
     ORDER BY l."createdAt", l.id`,
    [id],
  );

  const entityIds = [id, ...landsQuery.rows.map((land) => land.id)];
  const installmentsQuery = await db.query<ProducerInstallmentRow>(
    `SELECT id, "entityId", "entityType", name, "expectedDate",
            "expectedDateRecalculated" AS "recalculatedDate",
            "paidAt", "paidAmount", "order"
     FROM installments
     WHERE "entityId" = ANY($1::uuid[])
       AND type = 'producer'
       AND "parentId" IS NULL
       AND "deletedAt" IS NULL
     ORDER BY "entityId", "order", "createdAt", id`,
    [entityIds],
  );

  const byEntity = new Map<string, ProducerInstallmentRow[]>();
  for (const installment of installmentsQuery.rows) {
    const list = byEntity.get(installment.entityId) ?? [];
    list.push(installment);
    byEntity.set(installment.entityId, list);
  }

  const vrteValue = parseSetting(project.vrteValue);
  const landTotals = landsQuery.rows.map((land) => ({
    land,
    shortTermAmount: number(land.plannedProjectVrte) * vrteValue,
    longTermAmount: number(land.longTermVrte) * vrteValue,
  }));
  const shortTermAmount = landTotals.reduce(
    (total, item) => total + item.shortTermAmount,
    0,
  );
  const longTermAmount = landTotals.reduce(
    (total, item) => total + item.longTermAmount,
    0,
  );

  const views = [
    buildView(
      'total',
      'project',
      'Total do projeto',
      byEntity.get(id) ?? [],
      shortTermAmount,
      longTermAmount,
      null,
    ),
    ...landTotals.map(({ land, shortTermAmount: landShort, longTermAmount: landLong }) =>
      buildView(
        land.id,
        'modality',
        land.modalityName,
        byEntity.get(land.id) ?? [],
        landShort,
        landLong,
        {
          id: land.modalityId,
          name: land.modalityName,
          areaHa: land.totalArea === null ? null : number(land.totalArea),
        },
      ),
    ),
  ];

  return res.json({
    projectId: id,
    dataSource: getCurrentDb(),
    vrteValue: money(vrteValue),
    views,
  });
}
