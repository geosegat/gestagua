import { useEffect, useMemo, useRef, useState } from 'react';
import { LandPlot, MapPin, Search } from '../icons';
import ApiErrorBanner from '../components/ApiErrorBanner';
import { CARD } from '../components/Card';
import CarMap, { type CarLayer } from '../components/map/CarMap';
import { getApiErrorMessage } from '../lib/apiError';
import { formatNumber } from '../lib/format';
import { useGetBulkImoveisQuery, normalizeCarCode } from '../services/geoApi';
import { useGetPropertiesQuery } from '../services/gestaguaApi';
import type { Property } from '../types';

function normalize(s?: string | null): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** O CAR de uma propriedade: código do imóvel, com o registro ambiental de reserva. */
function carOf(property: Property): string | null {
  return property.propertyCode ?? property.ruralEnvironmentalRegistry ?? null;
}

export default function PropertyMapPage() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useGetPropertiesQuery({ page: 1, limit: 200 });

  const properties = useMemo(
    () => (data?.properties ?? []).filter((p) => carOf(p)),
    [data],
  );

  // códigos CAR normalizados, sem repetição, pra pedir as geometrias de uma vez
  const codes = useMemo(() => {
    const set = new Set<string>();
    for (const p of properties) {
      const car = carOf(p);
      if (car) set.add(normalizeCarCode(car));
    }
    return [...set];
  }, [properties]);

  const {
    data: bulk,
    isFetching: geoLoading,
    error: geoError,
  } = useGetBulkImoveisQuery(codes, { skip: codes.length === 0 });

  // geometria por código CAR normalizado
  const geoByCode = useMemo(() => {
    const map = new Map<string, CarLayer['geometry']>();
    bulk?.data.forEach((item) => map.set(normalizeCarCode(item.cod_imovel), item.geometry));
    return map;
  }, [bulk]);

  // uma camada por propriedade que tem geometria
  const layers: CarLayer[] = useMemo(() => {
    const out: CarLayer[] = [];
    for (const p of properties) {
      const car = carOf(p);
      const geometry = car ? geoByCode.get(normalizeCarCode(car)) : undefined;
      if (geometry) out.push({ id: p.id, geometry });
    }
    return out;
  }, [properties, geoByCode]);

  const mapped = new Set(layers.map((l) => l.id));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  function select(id: string) {
    setSelectedId(id);
    setFocusTrigger((n) => n + 1);
  }

  // seleciona a primeira propriedade com geometria assim que as camadas carregam
  useEffect(() => {
    if (layers.length > 0 && selectedId === null) {
      select(layers[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const q = normalize(search.trim());
  const filteredProperties = q
    ? properties.filter(
        (p) =>
          normalize(p.name).includes(q) ||
          normalize(p.community).includes(q) ||
          normalize(p.location?.municipality).includes(q),
      )
    : properties;

  const errorMessage = error ? getApiErrorMessage(error) : null;

  return (
    <>
      <div className="mb-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
          Território ativo do programa
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-tight text-brand-deep">
          Mapa de propriedades
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Áreas de CAR das propriedades participantes. Selecione uma propriedade pra localizá-la.
        </p>
      </div>

      {errorMessage && (
        <ApiErrorBanner
          error={errorMessage}
          onRetry={() => void refetch()}
          message="Não consegui carregar as propriedades"
        />
      )}

      <div className="grid h-[calc(100vh-230px)] min-h-[460px] gap-4 lg:grid-cols-[320px_1fr]">
        {/* lista de propriedades */}
        <div className={`flex flex-col overflow-hidden ${CARD}`}>
          <div className="border-b border-line px-3 py-2">
            <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 focus-within:border-brand/50">
              <Search size={13} className="shrink-0 text-ink-soft" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar propriedade…"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-soft/60"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                  className="shrink-0 text-[10px] text-ink-soft hover:text-ink"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              {isLoading
                ? 'Carregando…'
                : `${filteredProperties.length} de ${properties.length} · ${layers.length} no mapa`}
            </div>
          </div>
          <div className="brand-scroll flex-1 overflow-y-auto">
            {filteredProperties.map((p) => {
              const active = p.id === selectedId;
              const onMap = mapped.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onMap && select(p.id)}
                  disabled={!onMap}
                  className={[
                    'flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors',
                    active ? 'bg-brand-soft' : 'hover:bg-brand-soft/40',
                    onMap ? 'cursor-pointer' : 'cursor-default opacity-55',
                  ].join(' ')}
                >
                  <MapPin
                    size={15}
                    className={`mt-0.5 shrink-0 ${active ? 'text-brand' : 'text-ink-soft'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-ink">
                      {p.name || 'Propriedade sem nome'}
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-ink-soft">
                      {p.community || p.location.municipality || 'Localidade não informada'}
                      {p.totalAreaHa != null && ` · ${formatNumber(p.totalAreaHa)} ha`}
                    </div>
                    {!onMap && (
                      <div className="mt-1 text-[10.5px] text-warn">sem geometria no CAR</div>
                    )}
                  </div>
                </button>
              );
            })}
            {!isLoading && filteredProperties.length === 0 && (
              <div className="px-4 py-8 text-center text-[12.5px] text-ink-soft">
                {q ? 'Nenhuma propriedade encontrada.' : 'Nenhuma propriedade com CAR encontrada.'}
              </div>
            )}
          </div>
        </div>

        {/* mapa */}
        <div className={`relative overflow-hidden ${CARD}`}>
          {geoLoading && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-line bg-card/90 px-3 py-1 text-[11px] font-semibold text-ink-soft shadow-sm">
              <LandPlot size={13} className="text-accent" />
              carregando áreas…
            </div>
          )}
          {geoError ? (
            <div className="grid h-full place-items-center p-8 text-center text-[13px] text-ink-soft">
              Não consegui carregar as geometrias do CAR agora.
            </div>
          ) : (
            <CarMap
              layers={layers}
              selectedId={selectedId}
              focusTrigger={focusTrigger}
              onLayerClick={select}
            />
          )}
        </div>
      </div>
    </>
  );
}
