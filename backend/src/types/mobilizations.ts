import type { QueryResultRow } from 'pg';

export interface MobilizationRow extends QueryResultRow {
  id: string;
  local: string;
  plannedDate: string | Date | null;
  locality: string | null;
  city: string | null;
  responsible: string | null;
}

export interface Mobilization {
  id: string;
  local: string;
  plannedDate: string | Date | null;
  locality: string | null;
  city: string | null;
  responsible: string | null;
}
