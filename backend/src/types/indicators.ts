import type { QueryResultRow } from 'pg';

import type { Numeric } from './common';

export interface IndicatorProjectCountRow extends QueryResultRow {
  activeProjects: number;
}

export interface IndicatorYearRow extends QueryResultRow {
  year: number;
}

export interface IndicatorModalityRow extends QueryResultRow {
  id: string;
  name: string;
  code: string;
  implementations: number;
  plannedAreaHa: Numeric;
  restoredAreaHa: Numeric;
  restoredAreaFilled: number;
  appPlannedAreaHa: Numeric;
  appAreaFilled: number;
}

export interface IndicatorPaymentsRow extends QueryResultRow {
  totalInstallments: number;
  executedInstallments: number;
  paidInstallments: number;
  executedNotPaid: number;
  paidNotExecuted: number;
  recordedPaidAmount: Numeric;
  paidAmountFilled: number;
}

export interface IndicatorCarbonCultureRow extends QueryResultRow {
  id: string;
  name: string;
  landCultures: number;
  areaHa: Numeric;
  quantity: Numeric;
  productivityRows: number;
  storedCarbonRows: number;
  positiveStoredCarbonRows: number;
  minimumStoredCarbon: Numeric;
  maximumStoredCarbon: Numeric;
  units: string[];
}
