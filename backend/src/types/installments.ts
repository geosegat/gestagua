import type { QueryResultRow } from 'pg';

import type { Numeric } from './common';

export interface InstallmentProjectRow extends QueryResultRow {
  id: string;
  vrteValue: string | null;
}
export interface LandFinancialRow extends QueryResultRow {
  id: string;
  totalArea: Numeric;
  modalityId: string;
  modalityName: string;
  plannedProjectVrte: Numeric;
  longTermVrte: Numeric;
}

export interface ProducerInstallmentRow extends QueryResultRow {
  id: string;
  entityId: string;
  entityType: 'project' | 'land';
  name: string;
  expectedDate: string | Date;
  recalculatedDate: string | Date | null;
  paidAt: string | Date | null;
  paidAmount: Numeric;
  order: number;
}
