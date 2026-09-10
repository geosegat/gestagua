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
  propertyCode: string | null;
  ruralEnvironmentalRegistry: string | null;
  ruralEnvironmentalRegistryStatus: string | null;
  watershed_name: string | null;
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
  propertyCode: string | null;
  ruralEnvironmentalRegistry: string | null;
  ruralEnvironmentalRegistryStatus: string | null;
  /** Bacia hidrografica da propriedade (properties.watershedId). */
  watershed: string | null;
  totalProjects: number;
  location: {
    municipality: string | null;
    state: string | null;
    latitude: Numeric;
    longitude: Numeric;
  };
}

/** Modalidades implantadas na propriedade (agregado das lands dos projetos). */
export interface PropertyModalityRow extends QueryResultRow {
  modalityId: string;
  name: string;
  code: string;
  type: string;
  total_implantacoes: number;
  plannedArea: Numeric;
  executedArea: Numeric;
}

export interface PropertyModality {
  id: string;
  name: string;
  code: string;
  type: string;
  totalImplantations: number;
  plannedAreaHa: number | null;
  executedAreaHa: number | null;
}

/** Resposta de /propriedades/car/:codigo: o que o programa sabe sobre um CAR. */
export interface PropertyCarLink {
  car: string;
  dataSource: string;
  linked: boolean;
  property: Property | null;
  modalities: PropertyModality[];
}
