// Tipos compartilhados pelas rotas do espelho Gestágua.

export type ProjectStatus = "em_execucao" | "cancelado" | "arquivado" | (string & {});

export interface Project {
  id: string;
  contract: string | null;
  status: ProjectStatus;
  contractSigned: boolean | null;
  contractIssueDate: string | null;
  updatedAt?: string | null;
  stage: string | null;
  macroStage: string | null;
  watershed: string | null;
  property: {
    name: string | null;
    community: string | null;
    totalAreaHa: number | null;
    nativeVegetationAreaHa: number | null;
    totalSprings: number | null;
  };
  location: {
    municipality: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  tags?: string[];
  dataSource?: string;
}

export type ProjectDetail = Omit<Project, 'property'> & {
  portalId: number | null;
  revisionNumber: number | null;
  questionnaire: string | null;
  reasonForRevision: string | null;
  action: string | null;
  signatureLocation: string | null;
  notes: string | null;
  program: { id: string; name: string };
  responsible: { name: string } | null;
  producer: { name: string } | null;
  property: Project['property'] & {
    id: string;
    code: string | null;
    ruralEnvironmentalRegistry: string | null;
    accessRoute: string | null;
    ownershipNature: string | null;
    fiscalModules: number | null;
  };
  currentStage: {
    id: string;
    name: string | null;
    macroStage: string | null;
    description: string | null;
    expectedDuration: number | null;
    maximumDuration: number | null;
    shouldNotify: boolean | null;
    progress: number;
    totalActivities: number;
    completedActivities: number;
  } | null;
  tags: string[];
  dataSource: string;
};

export interface ProjectRouteContext {
  project: ProjectDetail;
}

export interface ProjectModalityResource {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unitOfMeasurement: string | null;
  unitAbbreviation: string | null;
}

export interface ProjectModalityCulture {
  id: string;
  name: string;
  cultureType: string;
  stratum: string;
  unit: string | null;
  supplyType: string;
  quantity: number | null;
  areaHa: number | null;
  irrigation: boolean;
  supplyDate: string | null;
  spacingBetweenLinesM: number | null;
  spacingBetweenPlantsM: number | null;
  resources: ProjectModalityResource[];
}

export interface ProjectModality {
  id: string;
  modality: {
    id: string;
    name: string;
    code: string;
    type: string;
    definition: string | null;
  };
  areaHa: number | null;
  executedAreaHa: number | null;
  previousLandUse: string | null;
  nativeVegetationAreaHa: number | null;
  irrigation: boolean;
  totalSprings: number | null;
  relief: string | null;
  landType: string | null;
  arrangement: {
    id: string;
    name: string | null;
    plantingDensity: number | null;
    cultures: Array<{
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
    }>;
  } | null;
  cultures: ProjectModalityCulture[];
  resources: Array<ProjectModalityResource & {
    supplyType: string;
    areaHa: number | null;
    supplyDate: string | null;
  }>;
}

export interface ProjectModalitiesResponse {
  projectId: string;
  dataSource: string;
  summary: {
    totalImplantations: number;
    plannedAreaHa: number | null;
    executedAreaHa: number | null;
    totalCultures: number;
    totalResources: number;
  };
  modalities: ProjectModality[];
}

export type ProjectStageStatus = 'current' | 'completed' | 'in_progress' | 'not_started';

export interface ProjectStageSummary {
  id: string;
  name: string;
  description: string | null;
  order: number;
  expectedDurationDays: number;
  maximumDurationDays: number | null;
  shouldNotify: boolean;
  macroStage: { id: string; name: string | null } | null;
  totalActivities: number;
  completedActivities: number;
  progress: number;
  status: ProjectStageStatus;
}

export interface ProjectStagesResponse {
  projectId: string;
  currentStageId: string | null;
  dataSource: string;
  summary: {
    totalStages: number;
    completedStages: number;
    totalActivities: number;
    completedActivities: number;
  };
  stages: ProjectStageSummary[];
}

export interface ProjectActivity {
  id: string;
  name: string;
  type: 'checkbox' | 'date' | 'list' | 'text' | 'upload' | (string & {});
  required: boolean;
  expectedDurationDays: number;
  order: number | null;
  parentId: string | null;
  completed: boolean;
  value: {
    checked: boolean | null;
    text: string | null;
    date: string | null;
  };
  completedAt: string | null;
  deadline: string | null;
  document: {
    id: string;
    name: string;
    mimeType: string | null;
    fileSize: number | null;
  } | null;
  children: ProjectActivity[];
}

export interface ProjectStageActivitiesResponse {
  projectId: string;
  currentStageId: string | null;
  dataSource: string;
  stage: {
    id: string;
    name: string;
    description: string | null;
    expectedDurationDays: number;
    maximumDurationDays: number | null;
    shouldNotify: boolean;
    macroStage: { id: string; name: string | null } | null;
    totalActivities: number;
    completedActivities: number;
    progress: number;
  };
  activities: ProjectActivity[];
}

export interface ProducerInstallment {
  id: string;
  order: number;
  name: string;
  expectedDate: string;
  recalculatedDate: string | null;
  paidAt: string | null;
  shortTermAmount: number;
  longTermAmount: number;
  totalAmount: number;
  paidAmount: number;
}

export interface ProducerInstallmentView {
  id: string;
  kind: 'project' | 'modality';
  label: string;
  modality: {
    id: string;
    name: string;
    areaHa: number | null;
  } | null;
  summary: {
    shortTermAmount: number;
    longTermAmount: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    paidPercentage: number;
    totalInstallments: number;
    paidInstallments: number;
    nextExpectedDate: string | null;
  };
  installments: ProducerInstallment[];
}

export interface ProjectInstallmentsResponse {
  projectId: string;
  dataSource: string;
  vrteValue: number;
  views: ProducerInstallmentView[];
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ProjectsResponse {
  program: string;
  dataSource: string;
  pagination: Pagination;
  projects: Project[];
}

export interface Producer {
  id: string;
  name: string | null;
  community: string | null;
  occupation: string | null;
  totalProperties: number;
}

export interface ProducersResponse {
  program: string;
  dataSource: string;
  pagination: Pagination;
  producers: Producer[];
}

export interface Property {
  id: string;
  name: string | null;
  community: string | null;
  producer: string | null;
  totalAreaHa: number | null;
  nativeVegetationAreaHa: number | null;
  totalSprings: number | null;
  totalProjects: number;
  location: {
    municipality: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export interface PropertiesResponse {
  program: string;
  dataSource: string;
  pagination: Pagination;
  properties: Property[];
}

export interface Mobilization {
  id: string;
  local: string;
  plannedDate: string | null;
  locality: string | null;
  city: string | null;
  responsible: string | null;
}

export interface MobilizationsResponse {
  program: string;
  dataSource: string;
  pagination: Pagination;
  mobilizations: Mobilization[];
}

export interface Program {
  id: string;
  name: string;
  proponentName: string | null;
  proponentUrl: string | null;
  duration: number | null;
}

export interface ProgramsResponse {
  dataSource: string;
  pagination: Pagination;
  programs: Program[];
}
