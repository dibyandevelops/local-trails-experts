'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as Dialog from '@radix-ui/react-dialog';
import { Trail, RouteData } from '@/types';
import {
  getSafetyLabelText,
  TRAIL_SAFETY_OPTIONS,
  TrailSafetyLabel,
} from '@/lib/trail-safety';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getSportLabel, TRAIL_SPORTS } from '@/services/constants/sports';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  deleteTrail,
  fetchTrailById,
  requestTrail,
  updateTrail,
  uploadTrailRoute,
} from '@/services/trails/trails.service';
// import {
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Area,
//   AreaChart,
// } from 'recharts';

const TrailPage: React.FunctionComponent = () => {
  const router = useRouter();
  const params = useParams();
  const trailId = params?.id as string;
  const queryClient = useQueryClient();
  const { data: currentUser = null } = useCurrentUser();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestDescription, setRequestDescription] = useState('');
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [safetyDraft, setSafetyDraft] = useState<TrailSafetyLabel[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapStyle =
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    (process.env.NEXT_PUBLIC_MAPTILER_KEY
      ? `https://api.maptiler.com/maps/satellite/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
      : ({
          version: 8,
          sources: {
            esri: {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              attribution: 'Esri, Maxar, Earthstar Geographics',
            },
          },
          layers: [
            {
              id: 'esri-satellite',
              type: 'raster',
              source: 'esri',
            },
          ],
        } as any));

  const {
    data: trail,
    isLoading: loading,
    error,
  } = useQuery<Trail>({
    queryKey: QUERY_KEYS.trails.byId(trailId),
    queryFn: ({ signal }) => fetchTrailById(trailId, signal),
    enabled: Boolean(trailId),
  });

  useEffect(() => {
    if (!trail) return;
    setSafetyDraft((trail.safety_labels || []) as TrailSafetyLabel[]);
  }, [trail]);

  const uploadRouteMutation = useMutation({
    mutationFn: (file: File) => uploadTrailRoute(trailId, file),
    onSuccess: (updatedTrail) => {
      queryClient.setQueryData(QUERY_KEYS.trails.byId(trailId), updatedTrail);
    },
  });

  const updateTrailMutation = useMutation({
    mutationFn: (payload: Partial<Trail>) => updateTrail(trailId, payload),
    onSuccess: (updatedTrail) => {
      queryClient.setQueryData(QUERY_KEYS.trails.byId(trailId), updatedTrail);
    },
  });

  const deleteTrailMutation = useMutation({
    mutationFn: () => deleteTrail(trailId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.trails.byId(trailId) });
      router.push('/trails');
    },
  });

  const requestTrailMutation = useMutation({
    mutationFn: () => requestTrail(trailId, requestDescription.trim()),
    onSuccess: () => {
      setRequestMessage('Request sent to experts/admin successfully.');
      setRequestDescription('');
      setRequestModalOpen(false);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await uploadRouteMutation.mutateAsync(file);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload route');
      console.error('Error uploading route:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const canUploadRoute = currentUser?.role === 'admin' || currentUser?.role === 'expert';
  const canRequestTrail = currentUser?.role === 'participant';

  const toggleSafetyLabel = (value: TrailSafetyLabel) => {
    setSafetyDraft((prev) =>
      prev.includes(value)
        ? prev.filter((label) => label !== value)
        : [...prev, value]
    );
  };

  const handleSaveSafetyLabels = async () => {
    if (!isAdmin || !trail) return;
    setAdminMessage(null);
    try {
      await updateTrailMutation.mutateAsync({ safety_labels: safetyDraft });
      setAdminMessage('Safety labels updated.');
    } catch (err) {
      setAdminMessage(
        err instanceof Error ? err.message : 'Failed to save safety labels'
      );
    }
  };

  const handleDeleteTrail = async () => {
    if (!isAdmin || !trail) return;
    const confirmed = window.confirm(
      `Delete trail \"${trail.name}\"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setAdminMessage(null);
    try {
      await deleteTrailMutation.mutateAsync();
    } catch (err) {
      setAdminMessage(err instanceof Error ? err.message : 'Failed to delete trail');
    }
  };

  // Calculate map bounds from route coordinates
  const getMapBounds = (routeData: RouteData) => {
    if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) {
      return null;
    }

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
  };

  // Convert route coordinates to GeoJSON LineString
  const getRouteGeoJSON = (routeData: RouteData) => {
    if (!routeData || !routeData.coordinates) {
      return null;
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeData.coordinates.map((c) => [c.longitude, c.latitude]),
      },
    };
  };

  const getArrowPoints = (routeData: RouteData) => {
    if (!routeData?.coordinates?.length) return [];
    const step = 25;
    const points: Array<{ lon: number; lat: number; angle: number }> = [];
    for (let i = step; i < routeData.coordinates.length; i += step) {
      const prev = routeData.coordinates[i - 1];
      const curr = routeData.coordinates[i];
      const dx = curr.longitude - prev.longitude;
      const dy = curr.latitude - prev.latitude;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      points.push({
        lon: curr.longitude,
        lat: curr.latitude,
        angle,
      });
    }
    return points;
  };

  // Prepare elevation chart data
  // const getElevationData = (routeData: RouteData) => {
  //   if (!routeData || !routeData.coordinates) {
  //     return [];
  //   }

  //   return routeData.coordinates
  //     .filter((c) => c.elevation !== undefined)
  //     .map((c) => ({
  //       distance: c.distance || 0,
  //       elevation: c.elevation || 0,
  //     }));
  // };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading trail...</p>
        </div>
      </div>
    );
  }

  if (error || !trail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600">
            {(error as Error)?.message || 'Trail not found'}
          </p>
        </div>
      </div>
    );
  }

  const hasLocation = trail.latitude !== null && trail.longitude !== null;
  const hasRoute = trail.route_data && trail.route_data.coordinates && trail.route_data.coordinates.length > 0;
  const routeData = trail.route_data as RouteData | null;
  const mapBounds = hasRoute && routeData ? getMapBounds(routeData) : null;
  const routeGeoJSON = hasRoute && routeData ? getRouteGeoJSON(routeData) : null;
  const arrowPoints = hasRoute && routeData ? getArrowPoints(routeData) : [];
  // const elevationData = hasRoute && routeData ? getElevationData(routeData) : [];

  // Determine map center and zoom
  let mapCenter = { longitude: 0, latitude: 0, zoom: 2 };
  if (mapBounds) {
    mapCenter = {
      longitude: mapBounds.centerLon,
      latitude: mapBounds.centerLat,
      zoom: 14,
    };
  } else if (hasLocation) {
    mapCenter = {
      longitude: trail.longitude!,
      latitude: trail.latitude!,
      zoom: 14,
    };
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-green-800">{trail.name}</h1>
            <p className="text-gray-600 mb-4">{trail.location}</p>
          </div>
          {canUploadRoute && (
            <div className="flex flex-col items-end gap-2">
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".gpx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors inline-block">
                  {uploading ? 'Uploading...' : '📤 Upload GPX Route'}
                </span>
              </label>
              {uploadSuccess && (
                <span className="text-green-600 text-sm">✓ Route uploaded successfully!</span>
              )}
              {uploadError && (
                <span className="text-red-600 text-sm">{uploadError}</span>
              )}
            </div>
          )}
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  router.push('/register');
                  return;
                }
                if (!canRequestTrail) {
                  setRequestMessage('Only participants can request this trail.');
                  return;
                }
                setRequestMessage(null);
                setRequestModalOpen(true);
              }}
              className="rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              Request This Trail
            </button>
            {requestMessage && (
              <span className="text-xs text-gray-600">{requestMessage}</span>
            )}
          </div>
        </div>

        {trail.description && (
          <p className="text-gray-700 mb-4">{trail.description}</p>
        )}

        <div className="flex flex-wrap gap-4 mb-4">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {trail.difficulty}
          </span>
          {trail.sport_type && (
            <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-sm">
              {getSportLabel(trail.sport_type)}
            </span>
          )}
          {routeData?.totalDistance ? (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {routeData.totalDistance.toFixed(2)} km
            </span>
          ) : trail.distance_km ? (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {trail.distance_km} km
            </span>
          ) : null}
          {routeData?.elevationGain ? (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              +{routeData.elevationGain.toFixed(0)} m ↑
            </span>
          ) : trail.elevation_gain_m ? (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              {trail.elevation_gain_m} m elevation
            </span>
          ) : null}
          {routeData?.elevationLoss ? (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
              -{routeData.elevationLoss.toFixed(0)} m ↓
            </span>
          ) : null}
          {trail.estimated_time_hours && (
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
              ~{trail.estimated_time_hours} hours
            </span>
          )}
        </div>

        {!!trail.safety_labels?.length && (
          <div className="mb-4 flex flex-wrap gap-2">
            {trail.safety_labels.map((label) => (
              <span
                key={`${trail.id}-safe-${label}`}
                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
              >
                {getSafetyLabelText(label)}
              </span>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h2 className="mb-2 text-base font-semibold text-gray-900">Admin Trail Controls</h2>
            <p className="mb-3 text-sm text-gray-600">
              Add safety labels or remove this trail.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {TRAIL_SAFETY_OPTIONS.map((option) => {
                const selected = safetyDraft.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleSafetyLabel(option.value)}
                    className={`rounded-full border px-3 py-1 text-sm ${selected
                      ? 'border-amber-600 bg-amber-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-amber-400'}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={trail.sport_type || 'mtb'}
                onChange={async (e) => {
                  try {
                    await updateTrailMutation.mutateAsync({
                      sport_type: e.target.value as Trail['sport_type'],
                    });
                    setAdminMessage('Trail sport updated.');
                  } catch (err) {
                    setAdminMessage(
                      err instanceof Error
                        ? err.message
                        : 'Failed to update sport type'
                    );
                  }
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {TRAIL_SPORTS.map((sport) => (
                  <option key={sport.value} value={sport.value}>
                    {sport.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSaveSafetyLabels}
                disabled={updateTrailMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {updateTrailMutation.isPending ? 'Saving...' : 'Save Labels'}
              </button>
              <button
                type="button"
                onClick={handleDeleteTrail}
                disabled={deleteTrailMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleteTrailMutation.isPending ? 'Deleting...' : 'Delete Trail'}
              </button>
            </div>
            {adminMessage && (
              <p className="mt-2 text-sm text-gray-700">{adminMessage}</p>
            )}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-lg overflow-hidden shadow-lg" style={{ height: '600px', width: '100%' }}>
        {hasRoute ? (
          <Map
            initialViewState={mapCenter}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
          >
            {routeGeoJSON && (
              <Source id="route" type="geojson" data={routeGeoJSON as any}>
                <Layer
                  id="route-line"
                  type="line"
                  paint={{
                    'line-color': '#22c55e',
                    'line-width': 4,
                    'line-opacity': 0.8,
                  }}
                />
              </Source>
            )}
            {arrowPoints.map((point, index) => (
              <Marker
                key={`route-arrow-${index}`}
                longitude={point.lon}
                latitude={point.lat}
                anchor="center"
              >
                <div
                  style={{ transform: `rotate(${point.angle}deg)` }}
                  className="text-white text-xs font-bold drop-shadow"
                >
                  ►
                </div>
              </Marker>
            ))}
            {/* {hasLocation && (
              <Marker
                longitude={trail.longitude!}
                latitude={trail.latitude!}
                anchor="bottom"
              >
                <div className="bg-green-600 text-white px-3 py-1 rounded-lg shadow-lg font-semibold cursor-pointer hover:bg-green-700 transition-colors">
                  🚵 {trail.name}
                </div>
              </Marker>
            )} */}
            {hasRoute && routeData && routeData.coordinates.length > 0 && (
              <>
                <Marker
                  longitude={routeData.coordinates[0].longitude}
                  latitude={routeData.coordinates[0].latitude}
                  anchor="bottom"
                >
                  <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    Start
                  </div>
                </Marker>
                <Marker
                  longitude={routeData.coordinates[routeData.coordinates.length - 1].longitude}
                  latitude={routeData.coordinates[routeData.coordinates.length - 1].latitude}
                  anchor="bottom"
                >
                  <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    End
                  </div>
                </Marker>
              </>
            )}
          </Map>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
            <p className="text-gray-500">No GPX route data available for this trail</p>
          </div>
        )}
      </div>

      <Dialog.Root open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Request Trail Activity
            </Dialog.Title>
            <p className="mt-1 text-sm text-gray-600">
              This sends your request to experts/admin. Add details to help them.
            </p>
            <textarea
              value={requestDescription}
              onChange={(e) => setRequestDescription(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Describe what you want (preferred date/time, group size, activity type...)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await requestTrailMutation.mutateAsync();
                  } catch (err) {
                    setRequestMessage(
                      err instanceof Error ? err.message : 'Failed to send request'
                    );
                  }
                }}
                disabled={requestTrailMutation.isPending}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {requestTrailMutation.isPending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* {hasRoute && elevationData.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-green-800">Elevation Profile</h2>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData}>
                <defs>
                  <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="distance"
                  label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined ? [`${value.toFixed(0)} m`, 'Elevation'] : ['', 'Elevation']
                  }

                  labelFormatter={(value) => `Distance: ${value.toFixed(2)} km`}
                />
                <Area
                  type="monotone"
                  dataKey="elevation"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#elevationGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {routeData && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Min Elevation:</span>
                <span className="ml-2 font-semibold">{routeData.minElevation.toFixed(0)} m</span>
              </div>
              <div>
                <span className="text-gray-600">Max Elevation:</span>
                <span className="ml-2 font-semibold">{routeData.maxElevation.toFixed(0)} m</span>
              </div>
              <div>
                <span className="text-gray-600">Elevation Gain:</span>
                <span className="ml-2 font-semibold text-green-600">
                  +{routeData.elevationGain.toFixed(0)} m
                </span>
              </div>
              <div>
                <span className="text-gray-600">Elevation Loss:</span>
                <span className="ml-2 font-semibold text-red-600">
                  -{routeData.elevationLoss.toFixed(0)} m
                </span>
              </div>
            </div>
          )}
        </div>
      )} */}
    </div>
  );
};

export default TrailPage;
