'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
import { getMapStyle, type MapStyleMode } from '@/lib/map-styles';
import 'maplibre-gl/dist/maplibre-gl.css';

type Props = {
  lat: string;
  lng: string;
  onChange: (next: { lat: string; lng: string }) => void;
  title?: string;
  markerLabel?: string;
};

const DEFAULT_CENTER = { longitude: 85.324, latitude: 27.7172, zoom: 11 };
const PICKER_LIGHT_MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
} as const;

export default function StoreLocationPicker({
  lat,
  lng,
  onChange,
  title = 'Pick location on map',
  markerLabel = 'Location',
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>('map');

  const mapStyle = useMemo(
    () => (mapStyleMode === 'map' ? PICKER_LIGHT_MAP_STYLE : getMapStyle('satellite')),
    [mapStyleMode]
  );
  const markerLat = lat ? Number(lat) : null;
  const markerLng = lng ? Number(lng) : null;
  const hasValidMarker =
    markerLat !== null &&
    markerLng !== null &&
    Number.isFinite(markerLat) &&
    Number.isFinite(markerLng);

  const initialViewState = useMemo(() => {
    if (hasValidMarker) {
      return { longitude: markerLng, latitude: markerLat, zoom: 13.5 };
    }
    return DEFAULT_CENTER;
  }, [hasValidMarker, markerLat, markerLng]);

  useEffect(() => {
    if (!hasValidMarker) {
      return;
    }
    mapRef.current?.flyTo({
      center: [markerLng, markerLat],
      zoom: 13.5,
      duration: 500,
    });
  }, [hasValidMarker, markerLat, markerLng]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) };
        onChange(next);
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 13.5,
          duration: 700,
        });
      },
      () => {
        // ignore, parent can show message if desired
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-950 dark:text-emerald-200"
          >
            Use my location
          </button>
          <div className="inline-flex overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <button
              type="button"
              aria-pressed={mapStyleMode === 'map'}
              onClick={() => setMapStyleMode('map')}
              className={`px-2.5 py-1 transition ${
                mapStyleMode === 'map' ? 'bg-white' : 'hover:bg-emerald-100'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              aria-pressed={mapStyleMode === 'satellite'}
              onClick={() => setMapStyleMode('satellite')}
              className={`px-2.5 py-1 transition ${
                mapStyleMode === 'satellite' ? 'bg-white' : 'hover:bg-emerald-100'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>
      </div>
      <div className="h-64 overflow-hidden rounded-xl border border-emerald-200/60 dark:border-emerald-900/60">
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          onClick={(event) => {
            const next = {
              lat: String(event.lngLat.lat),
              lng: String(event.lngLat.lng),
            };
            onChange(next);
          }}
        >
          <NavigationControl position="top-right" showCompass showZoom />
          {hasValidMarker && (
            <Marker longitude={markerLng} latitude={markerLat} anchor="bottom">
              <div className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white shadow">
                {markerLabel}
              </div>
            </Marker>
          )}
        </Map>
      </div>
    </div>
  );
}
