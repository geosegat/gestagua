import type { QueryResultRow } from 'pg';

import type { Numeric } from './common';

export interface DashboardTotalsRow extends QueryResultRow {
  activeProjects: number;
  activeProperties: number;
  totalAreaHa: Numeric;
  nativeVegetationAreaHa: Numeric;
  totalSprings: Numeric;
}

export interface DashboardModalityRow extends QueryResultRow {
  id: string;
  name: string;
  code: string;
  totalImplementations: number;
  totalProjects: number;
  plannedAreaHa: Numeric;
  executedAreaHa: Numeric;
}

export interface DashboardYearRow extends QueryResultRow {
  year: number;
}
