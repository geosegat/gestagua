// Cliente da api-prefeitura (GestAgua). Contrato em vps-sync/api-prefeitura/server.js.
// Base vazia = mesma origem (igual ao demo). Em dev o Vite faz proxy de /projetos.
const BASE = import.meta.env.VITE_API_URL ?? "";

const KEY_STORAGE = "gestagua_key";

const activeCalls = new Map<string, Promise<unknown>>();

export function getKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? "";
}
export function setKey(k: string): void {
  localStorage.setItem(KEY_STORAGE, k);
}
export function clearKey(): void {
  localStorage.removeItem(KEY_STORAGE);
}

/** Erro com status HTTP para o chamador tratar 401 (chave invalida). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function call<T>(route: string): Promise<T> {
  const key = `${getKey()}:${route}`;
  const activeCall = activeCalls.get(key);

  if (activeCall) {
    return activeCall as Promise<T>;
  }

  const request = fetch(`${BASE}${route}`, {
    headers: { "x-api-key": getKey() },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new ApiError(response.status, `HTTP ${response.status}`);
      }

      return response.json() as Promise<T>;
    })
    .finally(() => {
      activeCalls.delete(key);
    });

  activeCalls.set(key, request);

  return request;
}

// ---------- tipos (espelham mapProjeto do server.js) ----------

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

// ---------- rotas ----------

export function getProjects(params: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}): Promise<ProjectsResponse> {
  const q = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("busca", params.search);
  return call<ProjectsResponse>(`/projetos?${q.toString()}`);
}

export function getProducers(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<ProducersResponse> {
  const q = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) q.set("busca", params.search);
  return call<ProducersResponse>(`/produtores?${q.toString()}`);
}

export function getProperties(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<PropertiesResponse> {
  const q = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) q.set("busca", params.search);
  return call<PropertiesResponse>(`/propriedades?${q.toString()}`);
}

export function getMobilizations(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<MobilizationsResponse> {
  const q = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) q.set("busca", params.search);
  return call<MobilizationsResponse>(`/mobilizacoes?${q.toString()}`);
}

export function getPrograms(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<ProgramsResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) query.set("search", params.search);
  return call<ProgramsResponse>(`/programs?${query.toString()}`);
}

/**
 * Valida uma chave SEM gravar no storage (usada pela tela de login).
 * 'ok' | 'invalida'; erros de rede/500 estouram pro chamador tratar.
 */
export async function validateKey(key: string): Promise<"ok" | "invalid"> {
  const res = await fetch(`${BASE}/projetos?page=1&limit=1`, {
    headers: { "x-api-key": key },
  });
  if (res.status === 401) return "invalid";
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  return "ok";
}

/**
 * Busca todas as páginas (pra agregações da Visão Geral).
 * Trava em 10 páginas × 100 = 1000 projetos por segurança.
 */
export async function getAllProjects(): Promise<{
  projects: Project[];
  dataSource: string;
}> {
  const first = await getProjects({ page: 1, limit: 100 });
  const projects = [...first.projects];
  const totalPages = Math.min(first.pagination.totalPages, 10);
  for (let page = 2; page <= totalPages; page++) {
    const response = await getProjects({ page, limit: 100 });
    projects.push(...response.projects);
  }
  return { projects, dataSource: first.dataSource };
}

export function getProject(id: string): Promise<Project> {
  return call<Project>(`/projetos/${id}`);
}
