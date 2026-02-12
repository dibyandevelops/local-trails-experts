'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Trail, RouteData, User } from '@/types';
import {
  getSafetyLabelText,
  TRAIL_SAFETY_OPTIONS,
  TrailSafetyLabel,
} from '@/lib/trail-safety';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const TrailPage: React.FunctionComponent = () => {
  const router = useRouter();
  const params = useParams();
  const trailId = params?.id as string;
  const [trail, setTrail] = useState<Trail | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [savingLabels, setSavingLabels] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [safetyDraft, setSafetyDraft] = useState<TrailSafetyLabel[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (trailId) {
      fetchTrail();
    }
  }, [trailId]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();
        setCurrentUser(data.user || null);
      } catch {
        setCurrentUser(null);
      }
    };

    fetchUser();
  }, []);

  const fetchTrail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trails/${trailId}`);
      const data = await response.json();

      if (response.ok) {
        setTrail(data.trail);
        setSafetyDraft((data.trail.safety_labels || []) as TrailSafetyLabel[]);
      } else {
        setError(data.error || 'Failed to fetch trail');
      }
    } catch (err) {
      setError('Failed to fetch trail');
      console.error('Error fetching trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/trails/${trailId}/upload-route`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setTrail(data.trail);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        setUploadError(data.error || 'Failed to upload route');
      }
    } catch (err) {
      setUploadError('Failed to upload route');
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

  const toggleSafetyLabel = (value: TrailSafetyLabel) => {
    setSafetyDraft((prev) =>
      prev.includes(value)
        ? prev.filter((label) => label !== value)
        : [...prev, value]
    );
  };

  const handleSaveSafetyLabels = async () => {
    if (!isAdmin || !trail) return;
    setSavingLabels(true);
    setAdminMessage(null);
    try {
      const response = await fetch(`/api/trails/${trail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ safety_labels: safetyDraft }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAdminMessage(data.error || 'Failed to save safety labels');
        return;
      }
      setTrail(data.trail);
      setAdminMessage('Safety labels updated.');
    } catch {
      setAdminMessage('Failed to save safety labels');
    } finally {
      setSavingLabels(false);
    }
  };

  const handleDeleteTrail = async () => {
    if (!isAdmin || !trail) return;
    const confirmed = window.confirm(
      `Delete trail \"${trail.name}\"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setAdminMessage(null);
    try {
      const response = await fetch(`/api/trails/${trail.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        setAdminMessage(data.error || 'Failed to delete trail');
        return;
      }
      router.push('/trails');
    } catch {
      setAdminMessage('Failed to delete trail');
    } finally {
      setDeleting(false);
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

  // Prepare elevation chart data
  const getElevationData = (routeData: RouteData) => {
    if (!routeData || !routeData.coordinates) {
      return [];
    }

    return routeData.coordinates
      .filter((c) => c.elevation !== undefined)
      .map((c) => ({
        distance: c.distance || 0,
        elevation: c.elevation || 0,
      }));
  };

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
          <p className="text-red-600">{error || 'Trail not found'}</p>
        </div>
      </div>
    );
  }

  const hasLocation = trail.latitude !== null && trail.longitude !== null;
  const hasRoute = trail.route_data && trail.route_data.coordinates && trail.route_data.coordinates.length > 0;
  const routeData = trail.route_data as RouteData | null;
  const mapBounds = hasRoute && routeData ? getMapBounds(routeData) : null;
  const routeGeoJSON = hasRoute && routeData ? getRouteGeoJSON(routeData) : null;
  const elevationData = hasRoute && routeData ? getElevationData(routeData) : [];

  // Determine map center and zoom
  let mapCenter = { longitude: 0, latitude: 0, zoom: 2 };
  if (mapBounds) {
    mapCenter = {
      longitude: mapBounds.centerLon,
      latitude: mapBounds.centerLat,
      zoom: 12,
    };
  } else if (hasLocation) {
    mapCenter = {
      longitude: trail.longitude!,
      latitude: trail.latitude!,
      zoom: 12,
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
        </div>

        {trail.description && (
          <p className="text-gray-700 mb-4">{trail.description}</p>
        )}

        <div className="flex flex-wrap gap-4 mb-4">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {trail.difficulty}
          </span>
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
              <button
                type="button"
                onClick={handleSaveSafetyLabels}
                disabled={savingLabels}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingLabels ? 'Saving...' : 'Save Labels'}
              </button>
              <button
                type="button"
                onClick={handleDeleteTrail}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleting ? 'Deleting...' : 'Delete Trail'}
              </button>
            </div>
            {adminMessage && (
              <p className="mt-2 text-sm text-gray-700">{adminMessage}</p>
            )}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-lg overflow-hidden shadow-lg" style={{ height: '600px', width: '100%' }}>
        {hasLocation || hasRoute ? (
          <Map
            initialViewState={mapCenter}
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
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
            {hasLocation && (
              <Marker
                longitude={trail.longitude!}
                latitude={trail.latitude!}
                anchor="bottom"
              >
                <div className="bg-green-600 text-white px-3 py-1 rounded-lg shadow-lg font-semibold cursor-pointer hover:bg-green-700 transition-colors">
                  🚵 {trail.name}
                </div>
              </Marker>
            )}
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
            <p className="text-gray-500">No location data available for this trail</p>
          </div>
        )}
      </div>

      {hasRoute && elevationData.length > 0 && (
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
      )}
    </div>
  );
};

export default TrailPage;
