'use client';

import * as React from 'react';
import MapboxMap, {
  FullscreenControl as MapboxFullscreenControl,
  Layer as MapboxLayer,
  Marker as MapboxMarker,
  NavigationControl as MapboxNavigationControl,
  ScaleControl as MapboxScaleControl,
  Source as MapboxSource,
} from 'react-map-gl/mapbox';
import MapLibreMap, {
  FullscreenControl,
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
} from 'react-map-gl/maplibre';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
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
  isRouteLoading?: boolean;
  routeGeoJSON: GeoJSON;
  routeData: RouteData | null;
  mapCenter: { longitude: number; latitude: number; zoom: number };
  mapStyle: string;
  mapStyleMode: MapStyleMode;
  mapEngine: 'free' | 'mapbox';
  mapboxToken?: string;
  hideSwitchOnMobile?: boolean;
  onMapEngineChange: (engine: 'free' | 'mapbox') => void;
  onStyleModeChange: (mode: MapStyleMode) => void;
  komootEmbedUrl?: string | null;
  mapProvider: 'internal' | 'komoot';
  onMapProviderChange: (provider: 'internal' | 'komoot') => void;
};

function TrailMapSection({
  hasRoute,
  isRouteLoading = false,
  routeGeoJSON,
  routeData,
  mapCenter,
  mapStyle,
  mapStyleMode,
  mapEngine,
  mapboxToken,
  hideSwitchOnMobile = false,
  onMapEngineChange,
  onStyleModeChange,
  komootEmbedUrl,
  mapProvider,
  onMapProviderChange,
}: TrailMapSectionProps) {
  const mapRef = React.useRef<any>(null);
  const watchIdRef = React.useRef<number | null>(null);
  const followLocationRef = React.useRef(false);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isFollowingLocation, setIsFollowingLocation] = React.useState(false);
  const [locationStatus, setLocationStatus] = React.useState<
    'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'
  >('idle');
  const komootUrl = (komootEmbedUrl || '').trim();
  const normalizedKomootEmbedUrl = extractKomootEmbedUrl(komootUrl);
  const hasKomootEmbed = Boolean(normalizedKomootEmbedUrl);
  const komootOpenUrl = getKomootNavigateUrl(normalizedKomootEmbedUrl);
  const canUseMapbox = Boolean(mapboxToken);
  const activeMapEngine = mapEngine === 'mapbox' && canUseMapbox ? 'mapbox' : 'free';
  const MapComponent = activeMapEngine === 'mapbox' ? MapboxMap : MapLibreMap;
  const ActiveSource = activeMapEngine === 'mapbox' ? MapboxSource : Source;
  const ActiveLayer = activeMapEngine === 'mapbox' ? MapboxLayer : Layer;
  const ActiveMarker = activeMapEngine === 'mapbox' ? MapboxMarker : Marker;
  const ActiveNavigationControl = activeMapEngine === 'mapbox' ? MapboxNavigationControl : NavigationControl;
  const ActiveFullscreenControl = activeMapEngine === 'mapbox' ? MapboxFullscreenControl : FullscreenControl;
  const ActiveScaleControl = activeMapEngine === 'mapbox' ? MapboxScaleControl : ScaleControl;

  const stopFollowingLocation = React.useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    followLocationRef.current = false;
    setIsFollowingLocation(false);
  }, []);

  const startFollowingLocation = React.useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }

    stopFollowingLocation();
    setLocationStatus('requesting');
    followLocationRef.current = true;
    setIsFollowingLocation(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setUserLocation(nextLocation);
        setLocationStatus('active');
        if (followLocationRef.current && mapRef.current) {
          mapRef.current.flyTo({
            center: [nextLocation.longitude, nextLocation.latitude],
            zoom: Math.max(mapRef.current.getZoom(), 15),
            duration: 700,
          });
        }
      },
      (error) => {
        stopFollowingLocation();
        setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [stopFollowingLocation]);

  const recenterMap = React.useCallback(() => {
    if (isFollowingLocation) stopFollowingLocation();
    mapRef.current?.flyTo({
      center: [mapCenter.longitude, mapCenter.latitude],
      zoom: mapCenter.zoom,
      duration: 700,
    });
  }, [isFollowingLocation, mapCenter.latitude, mapCenter.longitude, mapCenter.zoom, stopFollowingLocation]);

  React.useEffect(() => stopFollowingLocation, [stopFollowingLocation]);

  React.useEffect(() => {
    setMapLoaded(false);
  }, [activeMapEngine, mapStyle]);

  React.useEffect(() => {
    if (!mapLoaded || !routeData?.coordinates?.length || !mapRef.current) return;
    if (followLocationRef.current) return;

    const lats = routeData.coordinates.map((point) => point.latitude);
    const lons = routeData.coordinates.map((point) => point.longitude);
    const bounds = [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ] as [[number, number], [number, number]];

    mapRef.current.fitBounds(bounds, {
      padding: { top: 58, right: 48, bottom: 42, left: 48 },
      duration: 0,
      maxZoom: 15,
    });
  }, [mapLoaded, routeData]);

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

  if (isRouteLoading) {
    return (
      <div className="mb-6">
        <div className="h-[300px] w-full bg-slate-900 shadow-[0_20px_60px_-25px_rgba(2,6,23,0.8)] sm:h-[460px] lg:h-[600px]">
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950">
            <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-slate-950/85 px-4 py-3 text-sm font-semibold text-white shadow-xl">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200/40 border-t-emerald-400" aria-hidden="true" />
              Loading trail map...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return hasRoute ? (
    <div className="mb-6">
      <div
        className={`mb-2 items-center justify-end gap-2 overflow-x-auto bg-transparent px-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex sm:overflow-visible sm:px-0 ${
          hideSwitchOnMobile ? 'hidden' : 'flex'
        }`}
      >
        {hasKomootEmbed && (
          <button
            type="button"
            onClick={() => onMapProviderChange('komoot')}
            className="h-9 shrink-0 whitespace-nowrap rounded-lg border border-emerald-200/70 bg-white/70 px-3 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur transition hover:bg-emerald-50/90 dark:border-emerald-900/70 dark:bg-slate-950/60 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
            aria-label="Switch to Komoot route view"
          >
            Komoot
          </button>
        )}
        {canUseMapbox && (
          <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-gray-200/70 bg-white/70 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/60">
            <button
              type="button"
              aria-pressed={activeMapEngine === 'free'}
              onClick={() => onMapEngineChange('free')}
              className={`h-9 shrink-0 whitespace-nowrap px-3 text-xs font-semibold transition ${
                activeMapEngine === 'free'
                  ? 'bg-emerald-700/90 text-white'
                  : 'text-gray-800 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-slate-900/70'
              }`}
              aria-label="Use free map provider"
            >
              Free
            </button>
            <button
              type="button"
              aria-pressed={activeMapEngine === 'mapbox'}
              onClick={() => onMapEngineChange('mapbox')}
              className={`h-9 shrink-0 whitespace-nowrap px-3 text-xs font-semibold transition ${
                activeMapEngine === 'mapbox'
                  ? 'bg-emerald-700/90 text-white'
                  : 'text-gray-800 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-slate-900/70'
              }`}
              aria-label="Use Mapbox provider"
            >
              Mapbox
            </button>
          </div>
        )}
        <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-gray-200/70 bg-white/70 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/60">
          <button
            type="button"
            aria-pressed={mapStyleMode === 'satellite'}
            onClick={() => onStyleModeChange('satellite')}
            className={`h-9 shrink-0 whitespace-nowrap px-3 text-xs font-semibold transition ${
              mapStyleMode === 'satellite'
                ? 'bg-emerald-700/90 text-white'
                : 'text-gray-800 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-slate-900/70'
            }`}
            aria-label="Use satellite map style"
          >
            Satellite
          </button>
          <button
            type="button"
            aria-pressed={mapStyleMode === 'map'}
            onClick={() => onStyleModeChange('map')}
            className={`h-9 shrink-0 whitespace-nowrap px-3 text-xs font-semibold transition ${
              mapStyleMode === 'map'
                ? 'bg-emerald-700/90 text-white'
                : 'text-gray-800 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-slate-900/70'
            }`}
            aria-label="Use simple map style"
          >
            Map
          </button>
        </div>
      </div>
      <div className="relative h-[300px] w-full overflow-hidden bg-slate-900 shadow-[0_20px_60px_-25px_rgba(2,6,23,0.8)] sm:h-[460px] lg:h-[600px]">
        <MapComponent
          key={`${activeMapEngine}-${mapStyleMode}`}
          ref={mapRef}
          initialViewState={mapCenter}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          {...(activeMapEngine === 'mapbox' ? { mapboxAccessToken: mapboxToken } : {})}
          onLoad={() => {
            setMapLoaded(true);
            if (activeMapEngine !== 'mapbox' || !mapboxToken) return;
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
          onDragStart={() => {
            if (followLocationRef.current) stopFollowingLocation();
          }}
        >
        <div className="absolute left-2 top-3 z-10 flex max-w-[calc(100%-1rem)] items-start sm:left-3 sm:top-3">
          <div className="inline-flex max-w-full items-stretch overflow-hidden rounded-lg border border-white/15 bg-slate-950/80 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={isFollowingLocation ? stopFollowingLocation : startFollowingLocation}
              className={`h-9 shrink-0 whitespace-nowrap border-0 border-r border-white/15 px-3 text-xs font-semibold transition ${
                isFollowingLocation
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-transparent text-white/90 hover:bg-white/10'
              }`}
              aria-pressed={isFollowingLocation}
              aria-label={isFollowingLocation ? 'Stop following current location' : 'Show and follow current location'}
            >
              <span className="sm:hidden">{isFollowingLocation ? 'Stop' : 'Locate me'}</span>
              <span className="hidden sm:inline">{isFollowingLocation ? 'Stop following' : 'Use my location'}</span>
            </button>
            <button
              type="button"
              onClick={recenterMap}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 border-0 border-r border-white/15 bg-transparent px-3 text-xs font-semibold text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300"
              aria-label="Recenter on trail route"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path d="M10 2.25a.75.75 0 0 1 .75.75v1.3a5.75 5.75 0 0 1 4.95 4.95H17a.75.75 0 0 1 0 1.5h-1.3a5.75 5.75 0 0 1-4.95 4.95V17a.75.75 0 0 1-1.5 0v-1.3a5.75 5.75 0 0 1-4.95-4.95H3a.75.75 0 0 1 0-1.5h1.3a5.75 5.75 0 0 1 4.95-4.95V3a.75.75 0 0 1 .75-.75Zm0 3.5A4.25 4.25 0 1 0 10 14.25 4.25 4.25 0 0 0 10 5.75Z" fill="currentColor" />
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
              </svg>
              <span>Route</span>
            </button>
            {locationStatus !== 'idle' && (
              <span
                className="inline-flex h-9 shrink-0 items-center whitespace-nowrap border-0 bg-transparent px-3 text-[11px] font-medium text-white/90"
                role="status"
                aria-live="polite"
              >
                <span className="sm:hidden">
                  {locationStatus === 'requesting' && 'GPS...'}
                  {locationStatus === 'active' && 'GPS'}
                  {locationStatus === 'denied' && 'Denied'}
                  {locationStatus === 'unavailable' && 'No GPS'}
                </span>
                <span className="hidden sm:inline">
                  {locationStatus === 'requesting' && 'Requesting GPS...'}
                  {locationStatus === 'active' && 'GPS active'}
                  {locationStatus === 'denied' && 'Location permission denied'}
                  {locationStatus === 'unavailable' && 'Location unavailable'}
                </span>
              </span>
            )}
          </div>
        </div>
        {!mapLoaded && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-slate-950/85 px-4 py-3 text-sm font-semibold text-white shadow-xl">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200/40 border-t-emerald-400" aria-hidden="true" />
              Loading trail map...
            </div>
          </div>
        )}
        <ActiveNavigationControl position="bottom-right" showCompass showZoom />
        <ActiveFullscreenControl position="bottom-right" />
        <ActiveScaleControl position="bottom-left" unit="metric" />
        {routeGeoJSON && (
          <ActiveSource id="route" type="geojson" data={routeGeoJSON as any}>
            <ActiveLayer
              id="route-line-glow"
              type="line"
              paint={{
                'line-color': '#10b981',
                'line-width': 6,
                'line-opacity': 0.22,
                'line-blur': 1,
              }}
            />
            <ActiveLayer
              id="route-line-casing"
              type="line"
              paint={{
                'line-color': '#064e3b',
                'line-width': 4.2,
                'line-opacity': 0.9,
              }}
            />
            <ActiveLayer
              id="route-line-core"
              type="line"
              paint={{
                'line-color': '#34d399',
                'line-width': 2.8,
                'line-opacity': 0.98,
              }}
            />
            <ActiveLayer
              id="route-line-highlight"
              type="line"
              paint={{
                'line-color': '#ecfeff',
                'line-width': 0.7,
                'line-opacity': 0.85,
              }}
            />
          </ActiveSource>
        )}
        {routeGeoJSON && (
          <ActiveLayer
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
            <ActiveMarker
              longitude={routeData.coordinates[0].longitude}
              latitude={routeData.coordinates[0].latitude}
              anchor="bottom"
            >
              <div className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                Start
              </div>
            </ActiveMarker>
            <ActiveMarker
              longitude={routeData.coordinates[routeData.coordinates.length - 1].longitude}
              latitude={routeData.coordinates[routeData.coordinates.length - 1].latitude}
              anchor="bottom"
            >
              <div className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                End
              </div>
            </ActiveMarker>
          </>
        )}
        {userLocation && (
          <ActiveMarker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            anchor="center"
          >
            <div
              className="h-4 w-4 rounded-full border-2 border-white bg-sky-500 shadow-[0_0_0_5px_rgba(14,165,233,0.25)]"
              title={`Your location, accuracy about ${Math.round(userLocation.accuracy)} metres`}
            />
          </ActiveMarker>
        )}
        </MapComponent>
      </div>
    </div>
  ) : (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-gray-600 dark:text-slate-300">No GPX route has been uploaded for this trail yet.</p>
    </div>
  );
}

export default React.memo(TrailMapSection);
