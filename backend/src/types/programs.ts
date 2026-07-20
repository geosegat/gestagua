import type { QueryResultRow } from 'pg';

export interface ProgramRow extends QueryResultRow {
  id: string;
  name: string;
  proponentName: string | null;
  proponentUrl: string | null;
  duration: number | null;
}

export interface Program {
  id: string;
  name: string;
  proponentName: string | null;
  proponentUrl: string | null;
  duration: number | null;
}
