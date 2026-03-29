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
import { useCurrentUser } from '@/hooks/use-current-user';
import Link from 'next/link';

const DEFAULT_CENTER = { longitude: 84.124, latitude: 28.3949, zoom: 6.6 };
export default function StoreLocatorClient() {
  const { data: user = null } = useCurrentUser();
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

  const queryKey = useMemo(
    () =>
      QUERY_KEYS.stores.list({
        lat: geo?.lat,
        lng: geo?.lng,
        bounds: useBoundsFilter ? bounds : null,
      }),
    [geo?.lat, geo?.lng, bounds, useBoundsFilter]
  );

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey,
    queryFn: () =>
      fetchStores({
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

  const mapStyle = useMemo(() => getMapStyle(mapStyleMode), [mapStyleMode]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Nearby stores
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Use your location or search by neighborhood and services.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={requestNearby}
              className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              Use my location
            </button>
            {user ? (
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800">
                    List my shop
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                          List my shop
                        </Dialog.Title>
                        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                          Fill in the details and we’ll follow up.
                        </p>
                      </div>
                      <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                        Close
                      </Dialog.Close>
                    </div>
                    <div className="mt-5">
                      <StoreRequestForm />
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            ) : (
              <Link
                href="/?login=1&next=/store-locator"
                className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                Sign in to list your shop
              </Link>
            )}
          </div>
        </div>

        {locationMessage && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {locationMessage}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={useBoundsFilter}
              onChange={(event) => setUseBoundsFilter(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Filter by map bounds
          </label>
        </div>

        <div className="mt-5 space-y-6">
          {isLoading && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              Loading stores…
            </div>
          )}
          {!isLoading && stores.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              No stores found for this area yet.
            </div>
          )}
          {groupedStores.map(([cityLabel, cityStores]) => (
            <div key={cityLabel} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {cityLabel}
                </p>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {cityStores.length} store{cityStores.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid gap-3">
                {cityStores.map((store) => (
                  <div
                    key={store.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      mapRef.current?.flyTo({
                        center: [store.longitude, store.latitude],
                        zoom: 14,
                        duration: 700,
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        mapRef.current?.flyTo({
                          center: [store.longitude, store.latitude],
                          zoom: 14,
                          duration: 700,
                        });
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {store.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {store.location}
                        </p>
                      </div>
                      {store.distance_km !== null && store.distance_km !== undefined && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                          {store.distance_km.toFixed(1)} km away
                        </span>
                      )}
                    </div>
                    {store.services && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                        {store.services}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-slate-300">
                      {store.hours && (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">
                          {store.hours}
                        </span>
                      )}
                      {store.phone && (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">
                          {store.phone}
                        </span>
                      )}
                      {store.website && (
                        <a
                          href={store.website}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                        >
                          Visit site
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                      >
                        Navigate
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Store map
          </h2>
          <div className="inline-flex overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <button
              type="button"
              aria-pressed={mapStyleMode === 'map'}
              onClick={() => setMapStyleMode('map')}
              className={`px-3 py-1 transition ${
                mapStyleMode === 'map' ? 'bg-white' : 'hover:bg-emerald-100'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              aria-pressed={mapStyleMode === 'satellite'}
              onClick={() => setMapStyleMode('satellite')}
              className={`px-3 py-1 transition ${
                mapStyleMode === 'satellite' ? 'bg-white' : 'hover:bg-emerald-100'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>
        <div className="relative mt-4 h-[420px] overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-900/60">
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
      </div>
    </section>
  );
}
