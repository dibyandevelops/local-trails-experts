'use client';

import Map, {
  FullscreenControl,
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RouteData, Trail } from '@/types';
import type { MapStyleMode } from '@/lib/map-styles';

type TrailsMapPreviewProps = {
  trail: Trail;
  mapStyle: string;
  mapStyleMode: MapStyleMode;
  onMapStyleModeChange: (mode: MapStyleMode) => void;
};

function getMapBounds(routeData: RouteData) {
  if (!routeData?.coordinates?.length) return null;
  const lats = routeData.coordinates.map((c) => c.latitude);
  const lons = routeData.coordinates.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    centerLat: (minLat + maxLat) / 2,
    centerLon: (minLon + maxLon) / 2,
  };
}

function getInitialZoom(bounds: {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}) {
  const latSpan = Math.abs(bounds.maxLat - bounds.minLat);
  const lonSpan = Math.abs(bounds.maxLon - bounds.minLon);
  const maxSpan = Math.max(latSpan, lonSpan);
  if (maxSpan < 0.004) return 16;
  if (maxSpan < 0.008) return 15;
  if (maxSpan < 0.02) return 14;
  if (maxSpan < 0.05) return 13;
  if (maxSpan < 0.1) return 12;
  if (maxSpan < 0.25) return 11;
  if (maxSpan < 0.6) return 10;
  return 9;
}

function getRouteGeoJSON(routeData: RouteData) {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routeData.coordinates.map((c) => [c.longitude, c.latitude]),
    },
  };
}

export default function TrailsMapPreview({
  trail,
  mapStyle,
  mapStyleMode,
  onMapStyleModeChange,
}: TrailsMapPreviewProps) {
  const routeData = trail.route_data as RouteData;
  const bounds = getMapBounds(routeData);
  const firstPoint = routeData.coordinates[0];
  const lastPoint = routeData.coordinates[routeData.coordinates.length - 1];

  return (
    <Map
      initialViewState={
        bounds
          ? {
              longitude: bounds.centerLon,
              latitude: bounds.centerLat,
              zoom: getInitialZoom(bounds),
            }
          : {
              longitude: trail.longitude || 0,
              latitude: trail.latitude || 0,
              zoom: 12,
            }
      }
      style={{ width: '100%', height: 'calc(82vh - 52px)' }}
      mapStyle={mapStyle}
    >
      <div className="absolute left-3 top-3 z-10 inline-flex overflow-hidden rounded-lg border border-white/15 bg-slate-950/70 shadow-lg backdrop-blur">
        <button
          type="button"
          aria-pressed={mapStyleMode === 'satellite'}
          onClick={() => onMapStyleModeChange('satellite')}
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
          onClick={() => onMapStyleModeChange('map')}
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
      <Source id="modal-route" type="geojson" data={getRouteGeoJSON(routeData) as any}>
        <Layer
          id="modal-route-glow"
          type="line"
          paint={{
            'line-color': '#10b981',
            'line-width': 10,
            'line-opacity': 0.25,
            'line-blur': 1.2,
          }}
        />
        <Layer
          id="modal-route-core"
          type="line"
          paint={{
            'line-color': '#34d399',
            'line-width': 4.5,
            'line-opacity': 0.98,
          }}
        />
      </Source>
      <Layer
        id="modal-route-arrows-layer"
        type="symbol"
        source="modal-route"
        layout={{
          'symbol-placement': 'line',
          'symbol-spacing': 120,
          'text-field': '›',
          'text-size': 28,
          'text-rotation-alignment': 'map',
          'text-keep-upright': false,
          'text-offset': [0, 0],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }}
        paint={{
          'text-color': '#16a34a',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1.2,
        }}
      />
      <Marker longitude={firstPoint.longitude} latitude={firstPoint.latitude} anchor="bottom">
        <div className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
          Start
        </div>
      </Marker>
      <Marker longitude={lastPoint.longitude} latitude={lastPoint.latitude} anchor="bottom">
        <div className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">
          End
        </div>
      </Marker>
    </Map>
  );
}

