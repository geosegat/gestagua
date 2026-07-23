import type { QueryResultRow } from 'pg';
import type { Numeric } from './common';

export interface ProjectRow extends QueryResultRow {
  id: string;
  contractNumber: string | null;
  status: string;
  contractIssuanceDate: string | Date | null;
  referenceYear: number;
  contractSigned: boolean | null;
  updatedAt: string | Date | null;
  etapa_nome: string | null;
  stage_name: string | null;
  property_name: string | null;
  community: string | null;
  totalArea: Numeric;
  nativeVegetationArea: Numeric;
  totalSprings: number | null;
  city: string | null;
  state: string | null;
  latitude: Numeric;
  longitude: Numeric;
  watershed_name: string | null;
}

export interface ProjectDetailRow extends ProjectRow {
  portalId: number | null;
  revisionNumber: number | null;
  questionnaire: string | null;
  reasonForRevision: string | null;
  action: string | null;
  signatureLocation: string | null;
  notes: string | null;
  program_id: string;
  program_name: string;
  responsible_name: string | null;
  producer_name: string | null;
  property_id: string;
  property_code: string | null;
  rural_environmental_registry: string | null;
  access_route: string | null;
  ownership_nature: string | null;
  fiscal_modules: Numeric;
  stage_id: string | null;
  stage_description: string | null;
  stage_expected_duration: number | null;
  stage_maximum_duration: number | null;
  stage_should_notify: boolean | null;
}

export interface ActivityProgressRow extends QueryResultRow {
  type: string;
  checked: boolean | null;
  text: string | null;
  activityDate: string | Date | null;
  documentId: string | null;
  checkedById: string | null;
}

export interface TagRow extends QueryResultRow {
  name: string;
}

export interface Project {
  id: string;
  contract: string | null;
  status: string;
  contractIssueDate: string | Date | null;
  referenceYear: number;
  contractSigned: boolean | null;
  updatedAt: string | Date | null;
  macroStage: string | null;
  stage: string | null;
  property: {
    name: string | null;
    community: string | null;
    totalAreaHa: Numeric;
    nativeVegetationAreaHa: Numeric;
    totalSprings: number | null;
  };
  location: {
    municipality: string | null;
    state: string | null;
    latitude: Numeric;
    longitude: Numeric;
  };
  watershed: string | null;
}
