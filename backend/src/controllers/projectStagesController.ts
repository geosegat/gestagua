import type { Request, Response } from 'express';

import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  ActivityNode,
  ActivityRow,
  IdParams,
  ProjectStageRow,
  ProjectStageStatus,
  StageParams,
  StageRow,
  StageSummaryRow,
} from '../types';
import { UUID_RE } from '../utils/validation';

function isActivityComplete(activity: {
  type: string;
  checked: boolean;
  text: string | null;
  activityDate: string | Date | null;
  documentId: string | null;
  checkedById: string | null;
}): boolean {
  switch (activity.type) {
    case 'checkbox':
      return activity.checked || activity.checkedById !== null;
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

function progress(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function stageStatus(
  id: string,
  currentStageId: string | null,
  completed: number,
  total: number,
): ProjectStageStatus {
  if (id === currentStageId) return 'current';
  if (total > 0 && completed === total) return 'completed';
  if (completed > 0) return 'in_progress';
  return 'not_started';
}

async function findProject(
  id: string,
): Promise<ProjectStageRow | undefined> {
  const query = await getPool().query<ProjectStageRow>(
    `SELECT id, "stageId" AS "currentStageId"
     FROM projects
     WHERE id = $1
       AND "programId" = $2
       AND "deletedAt" IS NULL`,
    [id, config.gestaguaProgramId],
  );

  return query.rows[0];
}

export async function listarEtapas(
  req: Request<IdParams>,
  res: Response,
): Promise<Response> {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ erro: 'id invalido' });
    }

    const project = await findProject(id);
    if (!project) {
      return res.status(404).json({ erro: 'projeto nao encontrado' });
    }

    const stagesQuery = await getPool().query<StageSummaryRow>(
      `WITH stage_progress AS MATERIALIZED (
         SELECT "stageId" AS id,
                COUNT(*) FILTER (WHERE type <> 'list')::int AS total,
                COUNT(*) FILTER (
                  WHERE type <> 'list'
                    AND (
                      (type = 'checkbox' AND (checked IS TRUE OR "checkedById" IS NOT NULL))
                      OR (type = 'text' AND BTRIM(COALESCE(text, '')) <> '')
                      OR (type = 'date' AND "activityDate" IS NOT NULL)
                      OR (type = 'upload' AND "documentId" IS NOT NULL)
                    )
                )::int AS completed
         FROM activities
         WHERE "projectId" = $1
           AND "deletedAt" IS NULL
         GROUP BY "stageId"
       ),
       project_stage_ids AS (
         SELECT id FROM stage_progress
         UNION
         SELECT $2::uuid AS id
         WHERE $2::uuid IS NOT NULL
       )
       SELECT s.id, s.name, s.description, s."order", s."expectedDuration",
              s."maximumDuration", s."shouldNotify",
              e.id AS "macroStageId", e.nome AS "macroStageName",
              e."order" AS "macroStageOrder",
              COALESCE(stage_progress.total, 0)::int AS "totalActivities",
              COALESCE(stage_progress.completed, 0)::int AS "completedActivities"
       FROM project_stage_ids project_stage
       JOIN stages s ON s.id = project_stage.id
       LEFT JOIN etapas e ON e.id = s."etapaId" AND e."deletedAt" IS NULL
       LEFT JOIN stage_progress ON stage_progress.id = s.id
       WHERE s."deletedAt" IS NULL
       ORDER BY e."order" NULLS LAST, s."order", s.name`,
      [id, project.currentStageId],
    );

    const stages = stagesQuery.rows.map((stage) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      order: stage.order,
      expectedDurationDays: stage.expectedDuration,
      maximumDurationDays: stage.maximumDuration,
      shouldNotify: stage.shouldNotify,
      macroStage: stage.macroStageId
        ? { id: stage.macroStageId, name: stage.macroStageName }
        : null,
      totalActivities: stage.totalActivities,
      completedActivities: stage.completedActivities,
      progress: progress(stage.completedActivities, stage.totalActivities),
      status: stageStatus(
        stage.id,
        project.currentStageId,
        stage.completedActivities,
        stage.totalActivities,
      ),
    }));

    return res.json({
      projectId: id,
      currentStageId: project.currentStageId,
      dataSource: getCurrentDb(),
      summary: {
        totalStages: stages.length,
        completedStages: stages.filter((stage) => stage.progress === 100).length,
        totalActivities: stages.reduce(
          (total, stage) => total + stage.totalActivities,
          0,
        ),
        completedActivities: stages.reduce(
          (total, stage) => total + stage.completedActivities,
          0,
        ),
      },
      stages,
    });
}

export async function listarAtividades(
  req: Request<StageParams>,
  res: Response,
): Promise<Response> {
    const { id, stageId } = req.params;
    if (!UUID_RE.test(id) || !UUID_RE.test(stageId)) {
      return res.status(400).json({ erro: 'id invalido' });
    }

    const project = await findProject(id);
    if (!project) {
      return res.status(404).json({ erro: 'projeto nao encontrado' });
    }

    const stageQuery = await getPool().query<StageRow>(
      `SELECT s.id, s.name, s.description, s."expectedDuration",
              s."maximumDuration", s."shouldNotify",
              e.id AS "macroStageId", e.nome AS "macroStageName"
       FROM stages s
       LEFT JOIN etapas e ON e.id = s."etapaId" AND e."deletedAt" IS NULL
       WHERE s.id = $2
         AND s."deletedAt" IS NULL
         AND (
           s.id = $3
           OR EXISTS (
             SELECT 1 FROM activities a
             WHERE a."projectId" = $1
               AND a."stageId" = s.id
               AND a."deletedAt" IS NULL
           )
         )`,
      [id, stageId, project.currentStageId],
    );

    const stage = stageQuery.rows[0];
    if (!stage) {
      return res.status(404).json({ erro: 'etapa nao encontrada no projeto' });
    }

    const activitiesQuery = await getPool().query<ActivityRow>(
      `SELECT a.id, a.name, a.type, a."isRequired", a."expectedDuration",
              a."order", a."parentId", a.checked, a.text, a."activityDate",
              a."checkedAt", a.deadline, a."checkedById", a."documentId",
              d.name AS "documentName", d."mimeType" AS "documentMimeType",
              d."fileSize" AS "documentFileSize"
       FROM activities a
       LEFT JOIN documents d
         ON d.id = a."documentId"
        AND d."deletedAt" IS NULL
       WHERE a."projectId" = $1
         AND a."stageId" = $2
         AND a."deletedAt" IS NULL
       ORDER BY a."order" NULLS LAST, a."createdAt", a.name`,
      [id, stageId],
    );

    const byId = new Map<string, ActivityNode>();
    for (const activity of activitiesQuery.rows) {
      byId.set(activity.id, {
        id: activity.id,
        name: activity.name,
        type: activity.type,
        required: activity.isRequired,
        expectedDurationDays: activity.expectedDuration,
        order: activity.order,
        parentId: activity.parentId,
        completed: isActivityComplete(activity),
        value: {
          checked:
            activity.type === 'checkbox'
              ? activity.checked || activity.checkedById !== null
              : null,
          text: activity.type === 'text' ? activity.text : null,
          date: activity.type === 'date' ? activity.activityDate : null,
        },
        completedAt: activity.checkedAt,
        deadline: activity.deadline,
        document:
          activity.documentId && activity.documentName
            ? {
                id: activity.documentId,
                name: activity.documentName,
                mimeType: activity.documentMimeType,
                fileSize: activity.documentFileSize,
              }
            : null,
        children: [],
      });
    }

    const roots: ActivityNode[] = [];
    for (const activity of byId.values()) {
      const parent = activity.parentId ? byId.get(activity.parentId) : undefined;
      if (parent) parent.children.push(activity);
      else roots.push(activity);
    }

    const sortNodes = (nodes: ActivityNode[]): void => {
      nodes.sort(
        (left, right) =>
          (left.order ?? Number.MAX_SAFE_INTEGER) -
            (right.order ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name, 'pt-BR'),
      );
      nodes.forEach((node) => sortNodes(node.children));
    };
    sortNodes(roots);

    const updateListCompletion = (node: ActivityNode): boolean => {
      node.children.forEach(updateListCompletion);
      if (node.type === 'list') {
        node.completed =
          node.children.length > 0 &&
          node.children.every((child) => child.completed);
      }
      return node.completed;
    };
    roots.forEach(updateListCompletion);

    const measurable = activitiesQuery.rows.filter(
      (activity) => activity.type !== 'list',
    );
    const completed = measurable.filter(isActivityComplete).length;

    return res.json({
      projectId: id,
      currentStageId: project.currentStageId,
      dataSource: getCurrentDb(),
      stage: {
        id: stage.id,
        name: stage.name,
        description: stage.description,
        expectedDurationDays: stage.expectedDuration,
        maximumDurationDays: stage.maximumDuration,
        shouldNotify: stage.shouldNotify,
        macroStage: stage.macroStageId
          ? { id: stage.macroStageId, name: stage.macroStageName }
          : null,
        totalActivities: measurable.length,
        completedActivities: completed,
        progress: progress(completed, measurable.length),
      },
      activities: roots,
    });
}
