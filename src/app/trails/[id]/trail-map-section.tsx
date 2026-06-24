'use client';

import * as React from 'react';
import Map, {
  FullscreenControl,
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
  type MapRef,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RouteData } from '@/types';
import type { MapStyleMode } from '@/lib/map-styles';
import { extractKomootEmbedUrl, getKomootNavigateUrl } from '@/lib/komoot';

type GeoJSON = {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
} | null;

type TrailMapSectionProps = {
  hasRoute: boolean;
  routeGeoJSON: GeoJSON;
  routeData: RouteData | null;
  mapCenter: { longitude: number; latitude: number; zoom: number };
  mapStyle: string;
  mapStyleMode: MapStyleMode;
  mapboxToken?: string;
  onStyleModeChange: (mode: MapStyleMode) => void;
  komootEmbedUrl?: string | null;
  mapProvider: 'internal' | 'komoot';
  onMapProviderChange: (provider: 'internal' | 'komoot') => void;
};

function TrailMapSection({
  hasRoute,
  routeGeoJSON,
  routeData,
  mapCenter,
  mapStyle,
  mapStyleMode,
  mapboxToken,
  onStyleModeChange,
  komootEmbedUrl,
  mapProvider,
  onMapProviderChange,
}: TrailMapSectionProps) {
  const mapRef = React.useRef<MapRef | null>(null);
  const komootUrl = (komootEmbedUrl || '').trim();
  const normalizedKomootEmbedUrl = extractKomootEmbedUrl(komootUrl);
  const hasKomootEmbed = Boolean(normalizedKomootEmbedUrl);
  const komootOpenUrl = getKomootNavigateUrl(normalizedKomootEmbedUrl);

  if (hasKomootEmbed && mapProvider === 'komoot') {
    return (
      <div className="mb-6 overflow-hidden rounded-xl border border-emerald-200/60 bg-white shadow-[0_20px_60px_-25px_rgba(2,6,23,0.5)] dark:border-emerald-900/60 dark:bg-slate-950">
        <div className="flex items-center justify-end gap-2 border-b border-emerald-200/60 px-3 py-2 dark:border-emerald-900/60">
          {komootOpenUrl && (
            <a
              href={komootOpenUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              Navigate on Komoot
            </a>
          )}
          <button
            type="button"
            onClick={() => onMapProviderChange('internal')}
            className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            Switch to Local Map
          </button>
        </div>
        <div className="h-[360px] w-full sm:h-[460px] lg:h-[600px]">
          <iframe
            src={normalizedKomootEmbedUrl}
            title="Komoot route map"
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200/60 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
          <span>Having trouble loading? Open the route directly on Komoot.</span>
          {komootOpenUrl && (
            <a
              href={komootOpenUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              Open in Komoot
            </a>
          )}
        </div>
      </div>
    );
  }

  return hasRoute ? (
    <div className="mb-6 h-[360px] w-full overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-[0_20px_60px_-25px_rgba(2,6,23,0.8)] sm:h-[460px] lg:h-[600px]">
      <Map
        ref={mapRef}
        initialViewState={mapCenter}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapboxAccessToken={mapboxToken}
        onLoad={() => {
          if (!mapboxToken) return;
          const map = mapRef.current?.getMap() as any;
          if (!map) return;
          if (!map.getSource('mapbox-dem')) {
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14,
            });
          }
          map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.1 });
        }}
      >
        <div className="absolute right-3 top-3 z-10 inline-flex overflow-hidden rounded-lg border border-white/15 bg-slate-950/70 shadow-lg backdrop-blur">
          {hasKomootEmbed && (
            <button
              type="button"
              onClick={() => onMapProviderChange('komoot')}
              className="px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10"
              title="Switch to Komoot route view"
            >
              Komoot
            </button>
          )}
          <button
            type="button"
            aria-pressed={mapStyleMode === 'satellite'}
            onClick={() => onStyleModeChange('satellite')}
            className={`px-3 py-2 text-xs font-semibold transition ${
              mapStyleMode === 'satellite'
                ? 'bg-white/15 text-white'
                : 'text-white/80 hover:bg-white/10'
            }`}
            title="Satellite imagery with places/labels"
          >
            Satellite
          </button>
          <button
            type="button"
            aria-pressed={mapStyleMode === 'map'}
            onClick={() => onStyleModeChange('map')}
            className={`px-3 py-2 text-xs font-semibold transition ${
              mapStyleMode === 'map'
                ? 'bg-white/15 text-white'
                : 'text-white/80 hover:bg-white/10'
            }`}
            title="Simple map view with places"
          >
            Map
          </button>
        </div>
        <NavigationControl position="top-right" showCompass showZoom />
        <FullscreenControl position="top-right" />
        <ScaleControl position="bottom-left" unit="metric" />
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON as any}>
            <Layer
              id="route-line-glow"
              type="line"
              paint={{
                'line-color': '#10b981',
                'line-width': 6,
                'line-opacity': 0.22,
                'line-blur': 1,
              }}
            />
            <Layer
              id="route-line-casing"
              type="line"
              paint={{
                'line-color': '#064e3b',
                'line-width': 4.2,
                'line-opacity': 0.9,
              }}
            />
            <Layer
              id="route-line-core"
              type="line"
              paint={{
                'line-color': '#34d399',
                'line-width': 2.8,
                'line-opacity': 0.98,
              }}
            />
            <Layer
              id="route-line-highlight"
              type="line"
              paint={{
                'line-color': '#ecfeff',
                'line-width': 0.7,
                'line-opacity': 0.85,
              }}
            />
          </Source>
        )}
        {routeGeoJSON && (
          <Layer
            id="route-arrows-layer"
            type="symbol"
            source="route"
            layout={{
              'symbol-placement': 'line',
              'symbol-spacing': 84,
              'text-field': '›',
              'text-size': 20,
              'text-rotation-alignment': 'map',
              'text-keep-upright': false,
              'text-offset': [0, 0],
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            }}
            paint={{
              'text-color': '#16a34a',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.2,
            }}
          />
        )}
        {hasRoute && routeData && routeData.coordinates.length > 0 && (
          <>
            <Marker
              longitude={routeData.coordinates[0].longitude}
              latitude={routeData.coordinates[0].latitude}
              anchor="bottom"
            >
              <div className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                Start
              </div>
            </Marker>
            <Marker
              longitude={routeData.coordinates[routeData.coordinates.length - 1].longitude}
              latitude={routeData.coordinates[routeData.coordinates.length - 1].latitude}
              anchor="bottom"
            >
              <div className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                End
              </div>
            </Marker>
          </>
        )}
      </Map>
    </div>
  ) : (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-gray-600 dark:text-slate-300">No GPX route has been uploaded for this trail yet.</p>
    </div>
  );
}

export default React.memo(TrailMapSection);
