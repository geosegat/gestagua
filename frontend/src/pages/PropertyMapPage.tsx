import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, LandPlot, MapPin, Search } from '../icons';
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
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // propriedade em destaque no mapa, pra mostrar o CAR e permitir copiá-lo
  const selectedProperty = properties.find((p) => p.id === selectedId) ?? null;
  const selectedCar = selectedProperty ? carOf(selectedProperty) : null;

  async function copyCar() {
    if (!selectedCar) return;
    try {
      await navigator.clipboard.writeText(selectedCar);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // navegador sem acesso à área de transferência (http, permissão): ignora
    }
  }

  // ?car=... na URL: veio de um clique na tela de Propriedades, pra abrir já
  // focado nessa propriedade
  const [searchParams] = useSearchParams();
  const carParam = searchParams.get('car');

  function select(id: string) {
    setSelectedId(id);
    setFocusTrigger((n) => n + 1);
    setCopied(false);
  }

  // ao carregar (ou quando muda o ?car): foca a propriedade pedida na URL; sem
  // ?car, foca a primeira com geometria
  useEffect(() => {
    if (layers.length === 0) return;

    if (carParam) {
      const target = normalizeCarCode(carParam);
      const wanted = properties.find((p) => {
        const car = carOf(p);
        return car && normalizeCarCode(car) === target && mapped.has(p.id);
      });
      if (wanted) {
        select(wanted.id);
        return;
      }
    }

    if (selectedId === null) select(layers[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, carParam]);

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
          {/* propriedade em destaque: nome + CAR, com botão pra copiar o código
              (pra mandar pra alguém consultar no SICAR) */}
          {selectedProperty && selectedCar && (
            <div className="absolute inset-x-3 top-3 z-10 flex items-center gap-3 rounded-[8px] border border-line bg-card/95 px-3.5 py-2.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,.35)] backdrop-blur">
              <MapPin size={16} className="shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-ink">
                  {selectedProperty.name || 'Propriedade sem nome'}
                </div>
                <div className="truncate font-mono text-[11px] text-ink-soft" title={selectedCar}>
                  {selectedCar}
                </div>
              </div>
              <button
                onClick={copyCar}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  copied
                    ? 'border-ok/40 text-ok'
                    : 'border-line text-brand hover:border-accent hover:text-brand-deep'
                }`}
              >
                {copied ? <CheckCircle2 size={14} /> : <ClipboardCheck size={14} />}
                {copied ? 'Copiado!' : 'Copiar CAR'}
              </button>
            </div>
          )}
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
