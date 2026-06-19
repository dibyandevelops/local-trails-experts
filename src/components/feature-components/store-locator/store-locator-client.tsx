'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Store } from '@/types';
import { fetchStores } from '@/services/stores/stores.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
import { getMapStyle, type MapStyleMode } from '@/lib/map-styles';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as Dialog from '@radix-ui/react-dialog';
import StoreRequestForm from '@/components/feature-components/store-locator/store-request-form';

const DEFAULT_CENTER = { longitude: 84.124, latitude: 28.3949, zoom: 6.6 };

const STORE_MAP_LIGHT_STYLE = {
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

function StoreCard({
  store,
  onFocus,
}: {
  store: Store;
  onFocus: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus();
        }
      }}
      className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-emerald-900/70 dark:hover:bg-emerald-950/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-950 dark:text-slate-50">{store.name}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{store.location}</p>
        </div>
        {store.distance_km !== null && store.distance_km !== undefined && (
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {store.distance_km.toFixed(1)} km
          </span>
        )}
      </div>

      {store.services && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600 dark:text-slate-300">
          {store.services}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {store.hours && (
          <span className="rounded-full border border-slate-200 bg-gray-50 px-2.5 py-1 text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {store.hours}
          </span>
        )}
        {store.phone && (
          <a
            href={`tel:${store.phone.replace(/\s+/g, '')}`}
            className="rounded-full border border-slate-200 bg-gray-50 px-2.5 py-1 text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={(event) => event.stopPropagation()}
          >
            {store.phone}
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 dark:border-lime-300 dark:bg-lime-300 dark:text-emerald-950 dark:hover:bg-lime-200"
          onClick={(event) => event.stopPropagation()}
        >
          Navigate with Google Map
        </a>
        {store.website && (
          <a
            href={store.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            onClick={(event) => event.stopPropagation()}
          >
            Website
          </a>
        )}
      </div>
    </article>
  );
}

export default function StoreLocatorClient() {
  const mapRef = useRef<MapRef | null>(null);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBounds = useRef<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>('map');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [bounds, setBounds] = useState<{
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null>(null);
  const [useBoundsFilter, setUseBoundsFilter] = useState(false);
  const [mapOptionsOpen, setMapOptionsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryKey = useMemo(
    () =>
      QUERY_KEYS.stores.list({
        search,
        lat: geo?.lat,
        lng: geo?.lng,
        bounds: useBoundsFilter ? bounds : null,
      }),
    [search, geo?.lat, geo?.lng, bounds, useBoundsFilter]
  );

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey,
    queryFn: () =>
      fetchStores({
        search,
        lat: geo?.lat,
        lng: geo?.lng,
        radius: 25,
        minLat: useBoundsFilter ? bounds?.minLat : undefined,
        maxLat: useBoundsFilter ? bounds?.maxLat : undefined,
        minLng: useBoundsFilter ? bounds?.minLng : undefined,
        maxLng: useBoundsFilter ? bounds?.maxLng : undefined,
      }),
    placeholderData: (prev) => prev,
    staleTime: 15000,
  });

  const mapStyle = useMemo(() => {
    if (mapStyleMode === 'map') return STORE_MAP_LIGHT_STYLE;
    return getMapStyle('satellite');
  }, [mapStyleMode]);

  const mapCenter = useMemo(() => {
    if (geo) {
      return { longitude: geo.lng, latitude: geo.lat, zoom: 12.5 };
    }
    if (stores.length > 0) {
      return {
        longitude: stores[0].longitude,
        latitude: stores[0].latitude,
        zoom: 11,
      };
    }
    return DEFAULT_CENTER;
  }, [geo, stores]);

  useEffect(() => {
    if (!geo || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [geo.lng, geo.lat],
      zoom: 12.5,
      duration: 900,
    });
  }, [geo]);

  const requestNearby = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported in this browser.');
      return;
    }
    setLocationMessage('Fetching your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationMessage('Showing stores near your location.');
      },
      () => {
        setLocationMessage('Unable to access your location. Check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    requestNearby();
  }, []);

  useEffect(() => {
    return () => {
      if (boundsTimer.current) {
        clearTimeout(boundsTimer.current);
        boundsTimer.current = null;
      }
    };
  }, []);

  const groupedStores = useMemo(() => {
    const grouped = stores.reduce<Record<string, Store[]>>((acc, store) => {
      const key = `${store.city || 'Other'}, Nepal`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(store);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [stores]);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-950 dark:text-slate-50">
            Cycle hub locator
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Search shops, use your location, or move the map to find support nearby.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800">
                Register shop
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-950 dark:text-slate-50">
                      Register a cycle hub
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                      Submit shop details for admin approval before it appears publicly.
                    </p>
                  </div>
                  <Dialog.Close className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
                    ✕
                  </Dialog.Close>
                </div>
                <div className="mt-5">
                  <StoreRequestForm />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      <div className="mt-4">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by shop, location, repair, rental..."
          className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {locationMessage && (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          {locationMessage}
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative order-2 h-[420px] overflow-hidden rounded-3xl border border-emerald-200/70 dark:border-emerald-900/60 sm:h-[520px] lg:order-1">
          <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={requestNearby}
              className="inline-flex items-center justify-center rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur hover:bg-emerald-50 dark:border-slate-700/80 dark:bg-slate-950/90 dark:text-emerald-200 dark:hover:bg-slate-900"
            >
              Use my location
            </button>
            <div className="overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/90">
              <button
                type="button"
                onClick={() => setMapOptionsOpen((open) => !open)}
                aria-expanded={mapOptionsOpen}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Map options
                <span aria-hidden="true">{mapOptionsOpen ? '-' : '+'}</span>
              </button>
              {mapOptionsOpen && (
                <div className="space-y-2 border-t border-gray-100 p-2 dark:border-slate-800">
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={useBoundsFilter}
                      onChange={(event) => setUseBoundsFilter(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Show current map area only
                  </label>
                  <div className="inline-flex overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <button
                      type="button"
                      aria-pressed={mapStyleMode === 'map'}
                      onClick={() => setMapStyleMode('map')}
                      className={`px-3 py-1.5 transition ${
                        mapStyleMode === 'map'
                          ? 'bg-white text-emerald-900 dark:bg-emerald-800 dark:text-white'
                          : 'hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                      }`}
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      aria-pressed={mapStyleMode === 'satellite'}
                      onClick={() => setMapStyleMode('satellite')}
                      className={`px-3 py-1.5 transition ${
                        mapStyleMode === 'satellite'
                          ? 'bg-white text-emerald-900 dark:bg-emerald-800 dark:text-white'
                          : 'hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                      }`}
                    >
                      Satellite
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <Map
            ref={mapRef}
            initialViewState={mapCenter}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
            onLoad={() => {
              const map = mapRef.current;
              if (!map) return;
              const next = map.getBounds();
              const nextBounds = {
                minLat: next.getSouth(),
                maxLat: next.getNorth(),
                minLng: next.getWest(),
                maxLng: next.getEast(),
              };
              lastBounds.current = nextBounds;
              setBounds(nextBounds);
            }}
            onMoveEnd={() => {
              const map = mapRef.current;
              if (!map) return;
              const next = map.getBounds();
              const nextBounds = {
                minLat: next.getSouth(),
                maxLat: next.getNorth(),
                minLng: next.getWest(),
                maxLng: next.getEast(),
              };
              const prev = lastBounds.current;
              const changed =
                !prev ||
                Math.abs(prev.minLat - nextBounds.minLat) > 0.002 ||
                Math.abs(prev.maxLat - nextBounds.maxLat) > 0.002 ||
                Math.abs(prev.minLng - nextBounds.minLng) > 0.002 ||
                Math.abs(prev.maxLng - nextBounds.maxLng) > 0.002;
              if (!changed) return;
              lastBounds.current = nextBounds;
              if (boundsTimer.current) {
                clearTimeout(boundsTimer.current);
              }
              boundsTimer.current = setTimeout(() => {
                setBounds(nextBounds);
              }, 250);
            }}
          >
            <NavigationControl position="top-right" showCompass showZoom />
            {geo && (
              <Marker longitude={geo.lng} latitude={geo.lat} anchor="bottom">
                <button
                  type="button"
                  onClick={() => {
                    mapRef.current?.flyTo({
                      center: [geo.lng, geo.lat],
                      zoom: 12.5,
                      duration: 700,
                    });
                  }}
                  className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white shadow hover:bg-blue-700"
                  aria-label="Fly to your location"
                >
                  You
                </button>
              </Marker>
            )}
            {stores.map((store) => (
              <Marker
                key={store.id}
                longitude={store.longitude}
                latitude={store.latitude}
                anchor="bottom"
              >
                <button
                  type="button"
                  onClick={() => {
                    mapRef.current?.flyTo({
                      center: [store.longitude, store.latitude],
                      zoom: 14,
                      duration: 700,
                    });
                  }}
                  className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white shadow hover:bg-emerald-700"
                  aria-label={`Fly to ${store.name}`}
                >
                  {store.name}
                </button>
              </Marker>
            ))}
          </Map>
          <button
            type="button"
            onClick={() => {
              if (!geo) {
                requestNearby();
                return;
              }
              mapRef.current?.flyTo({
                center: [geo.lng, geo.lat],
                zoom: 12.5,
                duration: 700,
              });
            }}
            className="absolute bottom-4 left-4 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-200"
          >
            Fly to my location
          </button>
        </div>

        <aside className="order-1 rounded-3xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40 lg:order-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-950 dark:text-slate-50">
                Listed hubs
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {isLoading ? 'Loading...' : `${stores.length} result${stores.length === 1 ? '' : 's'}`}
              </p>
            </div>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-4 max-h-[520px] space-y-4 overflow-y-auto pr-1 lg:max-h-[448px]">
            {isLoading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Loading cycle hubs...
              </div>
            )}
            {!isLoading && stores.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                No cycle hubs found. Try a broader search or turn off map area filtering.
              </div>
            )}
            {groupedStores.map(([cityLabel, cityStores]) => (
              <div key={cityLabel} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-300">
                    {cityLabel}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {cityStores.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {cityStores.map((store) => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      onFocus={() => {
                        mapRef.current?.flyTo({
                          center: [store.longitude, store.latitude],
                          zoom: 14,
                          duration: 700,
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
