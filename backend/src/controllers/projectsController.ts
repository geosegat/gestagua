import type { Request, Response } from 'express';
import type { QueryResultRow } from 'pg';

import config from '../config';
import { getCurrentDb, getPool } from '../db';
import { log } from '../log';

export const STATUS_PT = {
  executing: 'em_execucao',
  canceled: 'cancelado',
  archived: 'arquivado',
} as const;

type StatusOriginal = keyof typeof STATUS_PT;
type TranslatedStatus = (typeof STATUS_PT)[StatusOriginal];

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProjectRow extends QueryResultRow {
  id: string;
  contractNumber: string | null;
  status: string;
  contractIssuanceDate: string | Date | null;
  contractSigned: boolean | null;
  updatedAt: string | Date | null;
  etapa_nome: string | null;
  stage_name: string | null;
  property_name: string | null;
  community: string | null;
  totalArea: number | string | null;
  nativeVegetationArea: number | string | null;
  totalSprings: number | null;
  city: string | null;
  state: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  watershed_name: string | null;
}

interface TotalRow extends QueryResultRow {
  total: number;
}

interface TagRow extends QueryResultRow {
  name: string;
}

interface Project {
  id: string;
  contract: string | null;
  status: string;
  contractIssueDate: string | Date | null;
  contractSigned: boolean | null;
  updatedAt: string | Date | null;
  macroStage: string | null;
  stage: string | null;
  property: {
    name: string | null;
    community: string | null;
    totalAreaHa: number | string | null;
    nativeVegetationAreaHa: number | string | null;
    totalSprings: number | null;
  };
  location: {
    municipality: string | null;
    state: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
  };
  watershed: string | null;
}

interface ListarQuery {
  page?: string;
  limit?: string;
  status?: string;
  busca?: string;
}

interface DetalheParams {
  id: string;
}

function translateStatus(status: string): TranslatedStatus | string {
  if (status in STATUS_PT) {
    return STATUS_PT[status as StatusOriginal];
  }

  return status;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    contract: row.contractNumber,
    status: translateStatus(row.status),
    contractIssueDate: row.contractIssuanceDate,
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

// JOINs + filtro fixo do programa.
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
         p."contractSigned", p."updatedAt",
         s.name  AS stage_name,
         e.nome  AS etapa_nome,
         pr.name AS property_name, pr."totalArea",
         pr."nativeVegetationArea", pr."totalSprings", pr.community,
         a.city, a.state, a.latitude, a.longitude,
         w.name  AS watershed_name
  ${BASE_FROM}
`;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// GET /projetos — lista paginada
export async function listar(
  req: Request<object, object, object, ListarQuery>,
  res: Response,
): Promise<Response | void> {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page ?? '', 10) || 1);

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit ?? '', 10) || 20),
    );

    const offset = (page - 1) * limit;

    const params: string[] = [config.gestaguaProgramId];
    let where = '';

    if (req.query.status) {
      const requestedStatus = req.query.status;

      const rawStatus = (
        Object.keys(STATUS_PT) as StatusOriginal[]
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
      pagination: {
        page,
        perPage: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      projects: rowsQuery.rows.map(mapProject),
    });
  } catch (error: unknown) {
    log(`ERRO GET /projetos: ${getErrorMessage(error)}`);

    return res.status(500).json({
      erro: 'erro interno',
    });
  }
}

// GET /projetos/:id — detalhe
export async function detalhe(
  req: Request<DetalheParams>,
  res: Response,
): Promise<Response> {
  try {
    const { id } = req.params;

    if (!UUID_RE.test(id)) {
      return res.status(400).json({
        erro: 'id invalido',
      });
    }

    const db = getPool();
    const params = [config.gestaguaProgramId, id];

    const rowsQuery = await db.query<ProjectRow>(
      `${BASE_SELECT} AND p.id = $2`,
      params,
    );

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

    const project = {
      ...mapProject(row),
      tags: tagsQuery.rows.map((tag) => tag.name),
      dataSource: getCurrentDb(),
    };

    return res.json(project);
  } catch (error: unknown) {
    log(`ERRO GET /projetos/:id: ${getErrorMessage(error)}`);

    return res.status(500).json({
      erro: 'erro interno',
    });
  }
}
