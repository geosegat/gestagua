import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Geometrias do CAR (SICAR), servidas por um serviço à parte - o mesmo geo-api
 * que o MVGI usa. O painel manda os códigos CAR das propriedades e recebe os
 * polígonos (GeoJSON) de volta; a geometria não fica no banco do programa.
 *
 * É um `createApi` separado do gestaguaApi porque a base é outra e não usa a
 * chave x-api-key. Sem VITE_GEO_API_BASE_URL, os endpoints simplesmente não
 * resolvem e a tela de mapa mostra o aviso de configuração.
 */

const GEO_BASE = (import.meta.env.VITE_GEO_API_BASE_URL ?? '').replace(/\/$/, '');

const CAR_RE = /^([A-Z]{2}-\d{7}-[A-F0-9]{32})/i;

/** Normaliza o CAR pro formato canônico (UF-IBGE-HASH), ignorando sufixos. */
export function normalizeCarCode(code: string): string {
  const match = code.trim().match(CAR_RE);
  return match ? match[1].toUpperCase() : code.trim().toUpperCase();
}

/**
 * O código tem cara de CAR? Nem todo registro ambiental do cadastro é um: há
 * propriedade com número de protocolo no lugar do CAR, e nem o SICAR nem a API
 * do programa aceitam esses.
 */
export function isCarCode(code: string | null | undefined): boolean {
  return CAR_RE.test((code ?? '').trim());
}

export interface CarGeometry {
  type: string;
  coordinates: unknown;
}

export interface BulkImovelItem {
  cod_imovel: string;
  municipio?: string;
  geometry: CarGeometry;
}

export interface BulkImoveisResponse {
  data: BulkImovelItem[];
}

/**
 * Ficha cadastral de um imóvel no SICAR. Mesmos campos do bulk, mais a situação
 * (`des_condic`) e as áreas de APP/reserva legal - é o que alimenta o card
 * "Dados do Imóvel".
 */
export interface ImovelDetalhe extends BulkImovelItem {
  source?: string;
  ind_status?: string | null;
  ind_tipo?: string | null;
  des_condic?: string | null;
  num_area?: number | null;
  mod_fiscal?: number | null;
  cod_estado?: string | null;
  app?: unknown[];
  rl?: unknown[];
}

export const geoApi = createApi({
  reducerPath: 'geoApi',
  baseQuery: fetchBaseQuery({ baseUrl: GEO_BASE }),
  keepUnusedDataFor: 600,
  endpoints: (builder) => ({
    // ficha de um imóvel só, pelo código CAR (o bulk não traz a situação)
    getImovel: builder.query<ImovelDetalhe, string>({
      query: (code) => `/imovel/${encodeURIComponent(normalizeCarCode(code))}`,
    }),
    getBulkImoveis: builder.query<BulkImoveisResponse, string[]>({
      // ordena os códigos pra a chave de cache não variar com a ordem
      query: (codes) => ({
        url: '/imoveis/bulk',
        method: 'POST',
        body: { codes: [...codes].sort() },
      }),
    }),
  }),
});

export const { useGetBulkImoveisQuery, useGetImovelQuery } = geoApi;
