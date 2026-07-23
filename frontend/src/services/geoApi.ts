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

/** Normaliza o CAR pro formato canônico (UF-IBGE-HASH), ignorando sufixos. */
export function normalizeCarCode(code: string): string {
  const match = code.trim().match(/^([A-Z]{2}-\d{7}-[A-F0-9]{32})/i);
  return match ? match[1].toUpperCase() : code.trim().toUpperCase();
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

export const geoApi = createApi({
  reducerPath: 'geoApi',
  baseQuery: fetchBaseQuery({ baseUrl: GEO_BASE }),
  keepUnusedDataFor: 600,
  endpoints: (builder) => ({
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

export const { useGetBulkImoveisQuery } = geoApi;
