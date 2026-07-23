import type { Request, Response } from 'express';

import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  ActivityProgressRow,
  IdParams,
  Project,
  ProjectDetailRow,
  ProjectListQuery,
  ProjectRow,
  TagRow,
  TotalRow,
} from '../types';
import { parsePagination } from '../utils/pagination';
import { parseOptionalYear, UUID_RE } from '../utils/validation';

const PROJECT_YEAR_SQL = `
  EXTRACT(
    YEAR FROM COALESCE(p."contractIssuanceDate"::timestamp, p."createdAt")
  )::int
`;

export const STATUS_PT = {
  executing: 'em_execucao',
  canceled: 'cancelado',
  archived: 'arquivado',
} as const;

function translateStatus(status: string): string {
  if (status in STATUS_PT) {
    return STATUS_PT[status as keyof typeof STATUS_PT];
  }

  return status;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    contract: row.contractNumber,
    status: translateStatus(row.status),
    contractIssueDate: row.contractIssuanceDate,
    referenceYear: row.referenceYear,
    contractSigned: row.contractSigned,
    updatedAt: row.updatedAt,
    macroStage: row.etapa_nome,
    stage: row.stage_name,
    property: {
      name: row.property_name,
      community: row.community,
      totalAreaHa: row.totalArea,
      nativeVegetationAreaHa: row.nativeVegetationArea,
      totalSprings: row.totalSprings,
    },
    location: {
      municipality: row.city,
      state: row.state,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    watershed: row.watershed_name,
  };
}

const BASE_FROM = `
  FROM projects p
  LEFT JOIN stages s      ON s.id  = p."stageId"
  LEFT JOIN etapas e      ON e.id  = s."etapaId"
  LEFT JOIN properties pr ON pr.id = p."propertyId"
  LEFT JOIN addresses a   ON a.id  = pr."addressId"
  LEFT JOIN watersheds w  ON w.id  = pr."watershedId"
  WHERE p."programId" = $1
    AND p."deletedAt" IS NULL
`;

const BASE_SELECT = `
  SELECT p.id, p."contractNumber", p.status, p."contractIssuanceDate",
         ${PROJECT_YEAR_SQL} AS "referenceYear",
         p."contractSigned", p."updatedAt",
         s.name  AS stage_name,
         e.nome  AS etapa_nome,
         pr.name AS property_name, pr."totalArea",
         pr."nativeVegetationArea", pr."totalSprings", pr.community,
         a.city, a.state, a.latitude, a.longitude,
         w.name  AS watershed_name
  ${BASE_FROM}
`;

const DETAIL_SELECT = `
  SELECT p.id, p."contractNumber", p.status, p."contractIssuanceDate",
         ${PROJECT_YEAR_SQL} AS "referenceYear",
         p."contractSigned", p."updatedAt", p."portalId", p."revisionNumber",
         p.questionnaire, p."reasonForRevision", p.action,
         p."signatureLocation", p.notes,
         s.id AS stage_id, s.name AS stage_name,
         s.description AS stage_description,
         s."expectedDuration" AS stage_expected_duration,
         s."maximumDuration" AS stage_maximum_duration,
         s."shouldNotify" AS stage_should_notify,
         e.nome AS etapa_nome,
         pr.id AS property_id, pr.name AS property_name,
         pr."propertyCode" AS property_code,
         pr."ruralEnvironmentalRegistry" AS rural_environmental_registry,
         pr."accessRoute" AS access_route,
         pr."ownershipNature"::text AS ownership_nature,
         pr."fiscalModules" AS fiscal_modules,
         pr."totalArea", pr."nativeVegetationArea", pr."totalSprings",
         pr.community,
         a.city, a.state, a.latitude, a.longitude,
         w.name AS watershed_name,
         pg.id AS program_id, pg.name AS program_name,
         responsible.name AS responsible_name,
         producer_user.name AS producer_name
  FROM projects p
  LEFT JOIN stages s ON s.id = p."stageId"
  LEFT JOIN etapas e ON e.id = s."etapaId"
  LEFT JOIN properties pr ON pr.id = p."propertyId"
  LEFT JOIN addresses a ON a.id = pr."addressId"
  LEFT JOIN watersheds w ON w.id = pr."watershedId"
  LEFT JOIN programs pg ON pg.id = p."programId"
  LEFT JOIN users responsible ON responsible.id = p."responsibleId"
  LEFT JOIN producers producer ON producer.id = pr."producerId"
  LEFT JOIN users producer_user ON producer_user.id = producer."userId"
  WHERE p."programId" = $1
    AND p."deletedAt" IS NULL
    AND p.id = $2
`;

function isActivityComplete(activity: ActivityProgressRow): boolean {
  switch (activity.type) {
    case 'checkbox':
      return activity.checked === true || activity.checkedById !== null;
    case 'text':
      return Boolean(activity.text?.trim());
    case 'date':
      return activity.activityDate !== null;
    case 'upload':
      return activity.documentId !== null;
    default:
      return false;
  }
}

function getActivityProgress(activities: ActivityProgressRow[]) {
  const measurable = activities.filter((activity) => activity.type !== 'list');
  const completed = measurable.filter(isActivityComplete).length;

  return {
    progress:
      measurable.length === 0
        ? 0
        : Math.round((completed / measurable.length) * 100),
    totalActivities: measurable.length,
    completedActivities: completed,
  };
}

export async function listar(
  req: Request<object, object, object, ProjectListQuery>,
  res: Response,
): Promise<Response | void> {
    const { page, limit, offset } = parsePagination(req.query);

    const parsedYear = parseOptionalYear(req.query.ano);
    if (!parsedYear.valid) {
      return res.status(400).json({
        erro: 'ano invalido. Use quatro digitos entre 1900 e 2100',
      });
    }

    const params: Array<string | number> = [config.gestaguaProgramId];
    let where = '';

    if (req.query.status) {
      const requestedStatus = req.query.status;

      const rawStatus = (
        Object.keys(STATUS_PT) as Array<keyof typeof STATUS_PT>
      ).find(
        (status) =>
          STATUS_PT[status] === requestedStatus ||
          status === requestedStatus,
      );

      if (!rawStatus) {
        return res.status(400).json({
          erro: 'status invalido. Use: em_execucao, cancelado ou arquivado',
        });
      }

      params.push(rawStatus);
      where = ` AND p.status = $${params.length}`;
    }

    if (parsedYear.year !== null) {
      params.push(parsedYear.year);
      where += ` AND ${PROJECT_YEAR_SQL} = $${params.length}`;
    }

    const busca = (req.query.busca ?? '').trim();

    if (busca) {
      params.push(`%${busca}%`);
      const paramIndex = params.length;

      where +=
        ` AND (p."contractNumber" ILIKE $${paramIndex}` +
        ` OR pr.name ILIKE $${paramIndex}` +
        ` OR pr.community ILIKE $${paramIndex}` +
        ` OR a.city ILIKE $${paramIndex}` +
        ` OR s.name ILIKE $${paramIndex}` +
        ` OR e.nome ILIKE $${paramIndex})`;
    }

    const db = getPool();

    const totalQuery = await db.query<TotalRow>(
      `SELECT count(*)::int AS total ${BASE_FROM}${where}`,
      params,
    );

    const rowsQuery = await db.query<ProjectRow>(
      `${BASE_SELECT}${where}
       ORDER BY p."updatedAt" DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const total = totalQuery.rows[0]?.total ?? 0;

    return res.json({
      program: 'Gestagua',
      dataSource: getCurrentDb(),
      filters: {
        year: parsedYear.year,
      },
      pagination: {
        page,
        perPage: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      projects: rowsQuery.rows.map(mapProject),
    });
}

export async function detalhe(
  req: Request<IdParams>,
  res: Response,
): Promise<Response> {
    const { id } = req.params;

    if (!UUID_RE.test(id)) {
      return res.status(400).json({
        erro: 'id invalido',
      });
    }

    const db = getPool();
    const params = [config.gestaguaProgramId, id];

    const rowsQuery = await db.query<ProjectDetailRow>(DETAIL_SELECT, params);

    const row = rowsQuery.rows[0];

    if (!row) {
      return res.status(404).json({
        erro: 'projeto nao encontrado',
      });
    }

    const tagsQuery = await db.query<TagRow>(
      `SELECT t.name FROM tags t
       JOIN projects_tags pt ON pt.tag_id = t.id
       WHERE pt.project_id = $1 AND t."deletedAt" IS NULL
       ORDER BY t.name`,
      [id],
    );

    const activitiesQuery = row.stage_id
      ? await db.query<ActivityProgressRow>(
          `SELECT type, checked, text, "activityDate", "documentId", "checkedById"
           FROM activities
           WHERE "projectId" = $1
             AND "stageId" = $2
             AND "deletedAt" IS NULL`,
          [id, row.stage_id],
        )
      : { rows: [] as ActivityProgressRow[] };

    const stageProgress = getActivityProgress(activitiesQuery.rows);
    const summary = mapProject(row);

    const project = {
      ...summary,
      portalId: row.portalId,
      revisionNumber: row.revisionNumber,
      questionnaire: row.questionnaire,
      reasonForRevision: row.reasonForRevision,
      action: row.action,
      signatureLocation: row.signatureLocation,
      notes: row.notes,
      program: {
        id: row.program_id,
        name: row.program_name,
      },
      responsible: row.responsible_name
        ? { name: row.responsible_name }
        : null,
      producer: row.producer_name ? { name: row.producer_name } : null,
      property: {
        ...summary.property,
        id: row.property_id,
        code: row.property_code,
        ruralEnvironmentalRegistry: row.rural_environmental_registry,
        accessRoute: row.access_route,
        ownershipNature: row.ownership_nature,
        fiscalModules: row.fiscal_modules,
      },
      currentStage: row.stage_id
        ? {
            id: row.stage_id,
            name: row.stage_name,
            macroStage: row.etapa_nome,
            description: row.stage_description,
            expectedDuration: row.stage_expected_duration,
            maximumDuration: row.stage_maximum_duration,
            shouldNotify: row.stage_should_notify,
            ...stageProgress,
          }
        : null,
      tags: tagsQuery.rows.map((tag) => tag.name),
      dataSource: getCurrentDb(),
    };

    return res.json(project);
}
