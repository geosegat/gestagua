import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useRef, useState } from 'react';
import type { CarGeometry } from '../../services/geoApi';

/**
 * Mapa das áreas de CAR. Versão enxuta do CarMap do MVGI: só desenha os
 * polígonos das propriedades (GeoJSON vindo do geo-api), destaca o selecionado
 * e dá foco nele. Sem a ferramenta de desenho do original - aqui o mapa é só de
 * consulta.
 */

export interface CarLayer {
  id: string;
  geometry: CarGeometry;
}

interface Props {
  layers: CarLayer[];
  /** propriedade destacada/focada (id) */
  selectedId?: string | null;
  /** muda pra re-centralizar no selecionado mesmo sem trocar o id */
  focusTrigger?: number;
  onLayerClick?: (id: string) => void;
}

const CONTAINER = { width: '100%', height: '100%' };
const CENTER_ES = { lat: -20.76, lng: -41.53 }; // Alegre/ES
const INITIAL_ZOOM = 11; // abre já sobre a cidade, não a região toda
// zoom máximo ao focar numa propriedade individual
const FIT_MAX_ZOOM = 15;
const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeId: 'hybrid',
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
};

const BASE_STYLE = {
  fillColor: '#16a3b5',
  fillOpacity: 0.28,
  strokeColor: '#0c4a55',
  strokeWeight: 2,
  strokeOpacity: 1,
};
const HIGHLIGHT_STYLE = {
  fillColor: '#16a3b5',
  fillOpacity: 0.42,
  strokeColor: '#e8a33d',
  strokeWeight: 4,
  strokeOpacity: 1,
  zIndex: 10,
};

/** GeoJSON (Polygon/MultiPolygon) → conjuntos de anéis lat/lng do Google. */
function toRings(geometry: CarGeometry): google.maps.LatLngLiteral[][] {
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates as number[][][];
    return coords.map((ring) => ring.map(([lng, lat]) => ({ lat, lng })));
  }
  if (geometry.type === 'MultiPolygon') {
    const coords = geometry.coordinates as number[][][][];
    return coords.flatMap((poly) => poly.map((ring) => ring.map(([lng, lat]) => ({ lat, lng }))));
  }
  return [];
}

export default function CarMap({ layers, selectedId, focusTrigger, onLayerClick }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const polysRef = useRef<Map<string, google.maps.Polygon[]>>(new Map());
  const [ready, setReady] = useState(false);

  const onClickRef = useRef(onLayerClick);
  onClickRef.current = onLayerClick;

  // (re)desenha os polígonos quando as camadas mudam
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    polysRef.current.forEach((polys) => polys.forEach((p) => p.setMap(null)));
    polysRef.current.clear();

    for (const layer of layers) {
      try {
        const rings = toRings(layer.geometry);
        if (rings.length === 0) continue;
        // um polígono por anel externo; buracos não são tratados (raro no CAR)
        const polys = rings.map((ring) => {
          const polygon = new google.maps.Polygon({ paths: ring, ...BASE_STYLE, map });
          polygon.addListener('click', () => onClickRef.current?.(layer.id));
          return polygon;
        });
        polysRef.current.set(layer.id, polys);
      } catch {
        // geometria inválida: ignora, não derruba o mapa
      }
    }

    return () => {
      polysRef.current.forEach((polys) => polys.forEach((p) => p.setMap(null)));
      polysRef.current.clear();
    };
  }, [ready, layers]);

  // realça o selecionado
  useEffect(() => {
    polysRef.current.forEach((polys, id) => {
      const style = id === selectedId ? HIGHLIGHT_STYLE : BASE_STYLE;
      polys.forEach((p) => p.setOptions(style));
    });
  }, [selectedId, layers]);

  // centraliza no selecionado
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const polys = polysRef.current.get(selectedId);
    if (!polys || polys.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    polys.forEach((p) => p.getPath().forEach((ll) => bounds.extend(ll)));
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 64);
      google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
        const z = mapRef.current?.getZoom() ?? FIT_MAX_ZOOM;
        if (z > FIT_MAX_ZOOM) mapRef.current?.setZoom(FIT_MAX_ZOOM);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, focusTrigger]);

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="grid h-full place-items-center p-8 text-center text-[13px] text-ink-soft">
        O mapa precisa da chave do Google Maps (VITE_GOOGLE_MAPS_API_KEY) pra carregar.
      </div>
    );
  }
  if (!isLoaded) return <div className="h-full animate-pulse bg-line/30" />;

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER}
      center={CENTER_ES}
      zoom={INITIAL_ZOOM}
      options={MAP_OPTIONS}
      onLoad={(map) => {
        mapRef.current = map;
        setReady(true);
      }}
    />
  );
}
