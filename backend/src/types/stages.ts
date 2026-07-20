import type { QueryResultRow } from 'pg';

export interface ProjectStageRow extends QueryResultRow {
  id: string;
  currentStageId: string | null;
}

export interface StageSummaryRow extends QueryResultRow {
  id: string;
  name: string;
  description: string | null;
  order: number;
  expectedDuration: number;
  maximumDuration: number | null;
  shouldNotify: boolean;
  macroStageId: string | null;
  macroStageName: string | null;
  macroStageOrder: number | null;
  totalActivities: number;
  completedActivities: number;
}

export interface StageRow extends QueryResultRow {
  id: string;
  name: string;
  description: string | null;
  expectedDuration: number;
  maximumDuration: number | null;
  shouldNotify: boolean;
  macroStageId: string | null;
  macroStageName: string | null;
}

export interface ActivityRow extends QueryResultRow {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  expectedDuration: number;
  order: number | null;
  parentId: string | null;
  checked: boolean;
  text: string | null;
  activityDate: string | Date | null;
  checkedAt: string | Date | null;
  deadline: string | Date | null;
  checkedById: string | null;
  documentId: string | null;
  documentName: string | null;
  documentMimeType: string | null;
  documentFileSize: number | null;
}

export interface ActivityNode {
  id: string;
  name: string;
  type: string;
  required: boolean;
  expectedDurationDays: number;
  order: number | null;
  parentId: string | null;
  completed: boolean;
  value: {
    checked: boolean | null;
    text: string | null;
    date: string | Date | null;
  };
  completedAt: string | Date | null;
  deadline: string | Date | null;
  document: {
    id: string;
    name: string;
    mimeType: string | null;
    fileSize: number | null;
  } | null;
  children: ActivityNode[];
}

export type ProjectStageStatus =
  | 'current'
  | 'completed'
  | 'in_progress'
  | 'not_started';
