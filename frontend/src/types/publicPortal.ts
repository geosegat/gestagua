import type { DashboardModality } from './api';

/** Agregado por comunidade exibido no portal público (sem nomes de pessoas). */
export interface PublicCommunity {
  name: string;
  properties: number;
  projects: number;
  totalAreaHa: number;
  nativeVegetationAreaHa: number;
  totalSprings: number;
}

/** Resposta do GET /publico/portal: tudo que o portal precisa em uma chamada. */
export interface PublicPortalResponse {
  program: string;
  dataSource: string | null;
  filters: {
    year: number | null;
    availableYears: number[];
  };
  summary: {
    activeProjects: number;
    activeProperties: number;
    totalAreaHa: number;
    nativeVegetationAreaHa: number;
    totalSprings: number;
    totalImplementations: number;
  };
  finance: {
    totalInstallments: number;
    executedInstallments: number;
    paidInstallments: number;
    recordedPaidAmount: number;
  };
  restoration: {
    plannedAreaHa: number;
    restoredAreaHa: number;
    appAreaHa: number;
  };
  modalities: DashboardModality[];
  communities: PublicCommunity[];
  evolution: { year: number; projects: number }[];
}
