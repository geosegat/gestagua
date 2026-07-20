import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { clearKey, getKey } from '../lib/auth';
import type {
  MobilizationsResponse,
  ProducersResponse,
  ProgramsResponse,
  ProjectDetail,
  ProjectInstallmentsResponse,
  ProjectModalitiesResponse,
  ProjectsResponse,
  ProjectStageActivitiesResponse,
  ProjectStagesResponse,
  PropertiesResponse,
  AllProjectsResponse,
  PageParams,
  ProjectPageParams,
} from '../types';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  prepareHeaders(headers) {
    if (!headers.has('x-api-key')) {
      const key = getKey();
      if (key) headers.set('x-api-key', key);
    }
    return headers;
  },
});

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && api.endpoint !== 'validateKey') {
    clearKey();
    if (window.location.pathname !== '/login') window.location.replace('/login');
  }

  return result;
};

export const gestaguaApi = createApi({
  reducerPath: 'gestaguaApi',
  baseQuery: baseQueryWithAuth,
  keepUnusedDataFor: 300,
  refetchOnReconnect: true,
  tagTypes: ['Project', 'Projects', 'Producers', 'Properties', 'Mobilizations', 'Programs'],
  endpoints: (builder) => ({
    validateKey: builder.mutation<void, string>({
      query: (key) => ({
        url: '/projetos',
        params: { page: 1, limit: 1 },
        headers: { 'x-api-key': key },
      }),
    }),
    getProjects: builder.query<ProjectsResponse, ProjectPageParams>({
      query: ({ page, limit, search, status }) => ({
        url: '/projetos',
        params: { page, limit, ...(search ? { busca: search } : {}), ...(status ? { status } : {}) },
      }),
      providesTags: ['Projects'],
    }),
    getAllProjects: builder.query<AllProjectsResponse, void>({
      async queryFn(_arg, _api, _extraOptions, fetchWithBQ) {
        const firstResult = await fetchWithBQ({
          url: '/projetos',
          params: { page: 1, limit: 100 },
        });
        if (firstResult.error) return { error: firstResult.error };

        const first = firstResult.data as ProjectsResponse;
        const projects = [...first.projects];
        const totalPages = Math.min(first.pagination.totalPages, 10);

        for (let page = 2; page <= totalPages; page += 1) {
          const pageResult = await fetchWithBQ({
            url: '/projetos',
            params: { page, limit: 100 },
          });
          if (pageResult.error) return { error: pageResult.error };
          projects.push(...(pageResult.data as ProjectsResponse).projects);
        }

        return { data: { projects, dataSource: first.dataSource } };
      },
      providesTags: ['Projects'],
    }),
    getProject: builder.query<ProjectDetail, string>({
      query: (id) => `/projetos/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),
    getProjectModalities: builder.query<ProjectModalitiesResponse, string>({
      query: (id) => `/projetos/${id}/modalidades`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),
    getProjectInstallments: builder.query<ProjectInstallmentsResponse, string>({
      query: (id) => `/projetos/${id}/parcelas-produtor`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),
    getProjectStages: builder.query<ProjectStagesResponse, string>({
      query: (id) => `/projetos/${id}/etapas`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),
    getProjectStageActivities: builder.query<
      ProjectStageActivitiesResponse,
      { projectId: string; stageId: string }
    >({
      query: ({ projectId, stageId }) =>
        `/projetos/${projectId}/etapas/${stageId}/atividades`,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: projectId }],
    }),
    getProducers: builder.query<ProducersResponse, PageParams>({
      query: ({ page, limit, search }) => ({
        url: '/produtores',
        params: { page, limit, ...(search ? { busca: search } : {}) },
      }),
      providesTags: ['Producers'],
    }),
    getProperties: builder.query<PropertiesResponse, PageParams>({
      query: ({ page, limit, search }) => ({
        url: '/propriedades',
        params: { page, limit, ...(search ? { busca: search } : {}) },
      }),
      providesTags: ['Properties'],
    }),
    getMobilizations: builder.query<MobilizationsResponse, PageParams>({
      query: ({ page, limit, search }) => ({
        url: '/mobilizacoes',
        params: { page, limit, ...(search ? { busca: search } : {}) },
      }),
      providesTags: ['Mobilizations'],
    }),
    getPrograms: builder.query<ProgramsResponse, PageParams>({
      query: ({ page, limit, search }) => ({
        url: '/programs',
        params: { page, limit, ...(search ? { search } : {}) },
      }),
      providesTags: ['Programs'],
    }),
  }),
});

export const {
  useValidateKeyMutation,
  useGetProjectsQuery,
  useGetAllProjectsQuery,
  useGetProjectQuery,
  useGetProjectInstallmentsQuery,
  useGetProjectModalitiesQuery,
  useGetProjectStagesQuery,
  useGetProjectStageActivitiesQuery,
  useGetProducersQuery,
  useGetPropertiesQuery,
  useGetMobilizationsQuery,
  useGetProgramsQuery,
} = gestaguaApi;
