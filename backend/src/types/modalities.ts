import type { QueryResultRow } from 'pg';
import type { Numeric } from './common';

export interface ModalityProjectRow extends QueryResultRow {
  id: string;
}

export interface LandRow extends QueryResultRow {
  landId: string;
  totalArea: Numeric;
  realizedLandArea: Numeric;
  previousLandUse: string | null;
  nativeVegetationArea: Numeric;
  irrigation: boolean;
  totalSprings: number | null;
  relief: string | null;
  landType: string | null;
  modalityId: string;
  modalityName: string;
  modalityCode: string;
  modalityType: string;
  modalityDefinition: string | null;
  arrangementId: string | null;
  arrangementName: string | null;
  plantingDensity: Numeric;
}

export interface CultureRow extends QueryResultRow {
  id: string;
  landId: string;
  name: string;
  cultureType: string;
  stratum: string;
  unit: string | null;
  supplyType: string;
  quantity: Numeric;
  area: Numeric;
  irrigation: boolean;
  supplyDate: string | Date | null;
  spacingBetweenLines: Numeric;
  spacingBetweenPlants: Numeric;
}

export interface ResourceRow extends QueryResultRow {
  id: string;
  landId: string;
  name: string;
  category: string;
  supplyType: string;
  quantity: Numeric;
  area: Numeric;
  supplyDate: string | Date | null;
  unitOfMeasurement: string | null;
  unitAbbreviation: string | null;
}

export interface CultureResourceRow extends QueryResultRow {
  id: string;
  landCultureId: string;
  name: string;
  category: string;
  quantity: Numeric;
  unitOfMeasurement: string | null;
  unitAbbreviation: string | null;
}

export interface ArrangementCultureRow extends QueryResultRow {
  id: string;
  arrangementId: string;
  type: string;
  cultureName: string;
  lineId: string | null;
  lineName: string | null;
  lineOrder: number | null;
  verticalSpacing: Numeric;
  horizontalSpacing: Numeric;
}

export interface Resource {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unitOfMeasurement: string | null;
  unitAbbreviation: string | null;
}

export interface ArrangementCulture {
  id: string;
  name: string;
  type: string;
  lines: Array<{
    id: string;
    name: string | null;
    order: number | null;
    verticalSpacing: number | null;
    horizontalSpacing: number | null;
  }>;
}
