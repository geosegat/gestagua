import type { QueryResultRow } from 'pg';
import type { Numeric } from './common';

export interface PropertyRow extends QueryResultRow {
  id: string;
  name: string | null;
  community: string | null;
  producer: string | null;
  totalArea: Numeric;
  nativeVegetationArea: Numeric;
  totalSprings: number | null;
  ruralEnvironmentalRegistry: string | null;
  ruralEnvironmentalRegistryStatus: string | null;
  total_projetos: number;
  city: string | null;
  state: string | null;
  latitude: Numeric;
  longitude: Numeric;
}

export interface Property {
  id: string;
  name: string | null;
  community: string | null;
  producer: string | null;
  totalAreaHa: Numeric;
  nativeVegetationAreaHa: Numeric;
  totalSprings: number | null;
  ruralEnvironmentalRegistry: string | null;
  ruralEnvironmentalRegistryStatus: string | null;
  totalProjects: number;
  location: {
    municipality: string | null;
    state: string | null;
    latitude: Numeric;
    longitude: Numeric;
  };
}
