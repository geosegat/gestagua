import type { QueryResultRow } from 'pg';

import type { Numeric } from './common';

/** Linhas do agregado por comunidade do portal público. */
export interface PublicCommunityRow extends QueryResultRow {
  community: string;
  properties: number;
  projects: number;
  totalAreaHa: Numeric;
  nativeVegetationAreaHa: Numeric;
  totalSprings: Numeric;
}

/** Evolução anual (contagem de projetos por ano de contrato). */
export interface PublicEvolutionRow extends QueryResultRow {
  year: number;
  projects: number;
}

/** Somatórios de restauração das áreas dos projetos ativos. */
export interface PublicRestorationRow extends QueryResultRow {
  plannedAreaHa: Numeric;
  restoredAreaHa: Numeric;
  appAreaHa: Numeric;
}
