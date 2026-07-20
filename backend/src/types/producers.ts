import type { QueryResultRow } from 'pg';

export interface ProducerRow extends QueryResultRow {
  id: string;
  name: string | null;
  community: string | null;
  occupation: string | null;
  total_propriedades: number;
}

export interface Producer {
  id: string;
  name: string | null;
  community: string | null;
  occupation: string | null;
  totalProperties: number;
}
