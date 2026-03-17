'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Map, {
  FullscreenControl,
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as Dialog from '@radix-ui/react-dialog';
import { Trail, RouteData, User, SportType } from '@/types';
import {
  getSafetyLabelText,
  TRAIL_SAFETY_OPTIONS,
  type TrailSafetyLabel,
} from '@/lib/trail-safety';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getSportLabel, TRAIL_SPORTS } from '@/services/constants/sports';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { fetchVerifiedExperts } from '@/services/events/events.service';
import {
  deleteTrail,
  fetchTrailById,
  hideTrail,
  requestTrail,
  updateTrail,
  uploadTrailRoute,
} from '@/services/trails/trails.service';
import EventForm from '@/components/feature-components/event-form/event-form';
import { getMapStyle, type MapStyleMode } from '@/lib/map-styles';
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
  const { data: currentUser, isLoading: loadingCurrentUser } = useCurrentUser();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [pendingGpxFile, setPendingGpxFile] = useState<File | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [requestDescription, setRequestDescription] = useState('');
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [safetyDraft, setSafetyDraft] = useState<TrailSafetyLabel[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>(() => {
    if (typeof window === 'undefined') return 'map';
    const saved = window.localStorage.getItem('mtb_map_style_mode');
    return saved === 'map' || saved === 'satellite' ? saved : 'map';
  });
  const mapStyle = getMapStyle(mapStyleMode);

  useEffect(() => {
    try {
      window.localStorage.setItem('mtb_map_style_mode', mapStyleMode);
    } catch {
      // ignore
    }
  }, [mapStyleMode]);

  useEffect(() => {
    if (!galleryModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!trailImages.length) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveImageIndex((prev) => (prev === trailImages.length - 1 ? 0 : prev + 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveImageIndex((prev) => (prev === 0 ? trailImages.length - 1 : prev - 1));
      }
      if (event.key === 'Escape') {
        setGalleryModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [galleryModalOpen]);

  const {
    data: trail,
    isLoading: loading,
    error,
  } = useQuery<Trail>({
    queryKey: QUERY_KEYS.trails.byId(trailId),
    queryFn: ({ signal }) => fetchTrailById(trailId, signal),
    enabled: Boolean(trailId),
  });

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
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
      queryClient.invalidateQueries({ queryKey: ['trails'] });
      queryClient.invalidateQueries({ queryKey: ['trails-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['trails-infinite'] });
      router.push('/trails');
    },
  });

  const hideTrailMutation = useMutation({
    mutationFn: () => hideTrail(trailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trails.byId(trailId) });
      queryClient.invalidateQueries({ queryKey: ['trails'] });
      queryClient.invalidateQueries({ queryKey: ['trails-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['trails-infinite'] });
      setAdminMessage('Trail hidden.');
    },
  });


  const requestTrailMutation = useMutation({
    mutationFn: () =>
      requestTrail(trailId, {
        description: requestDescription.trim(),
        expert_user_id: selectedExpertId,
        preferred_date: preferredDate,
      }),
    onSuccess: () => {
      setRequestMessage('Request sent to experts/admin successfully.');
      setRequestDescription('');
      setSelectedExpertId('');
      setPreferredDate('');
      setRequestModalOpen(false);
    },
  });

  const performRouteUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setActionMessage(null);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const hasExistingRoute =
      Boolean(trail?.route_data?.coordinates) &&
      (trail?.route_data?.coordinates?.length || 0) > 0;

    if (hasExistingRoute) {
      setPendingGpxFile(file);
      setReplaceConfirmOpen(true);
      return;
    }

    await performRouteUpload(file);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isOwnerExpert =
    currentUser?.role === 'expert' && trail?.submitted_by_user_id === currentUser?.id;
  const canManageTrail = isAdmin || isOwnerExpert;
  const canUploadRoute = currentUser?.role === 'admin';
  const canRequestTrail = currentUser?.role === 'participant';

  const toggleSafetyLabel = (value: TrailSafetyLabel) => {
    setSafetyDraft((prev) =>
      prev.includes(value)
        ? prev.filter((label) => label !== value)
        : [...prev, value]
    );
  };

  const handleSaveSafetyLabels = async () => {
    if (!canManageTrail || !trail) return;
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
    if (!canManageTrail || !trail) return;
    const confirmed = window.confirm(
      isAdmin
        ? `Delete trail \"${trail.name}\"? This action cannot be undone.`
        : `Hide trail \"${trail.name}\"? It will no longer appear in public listings.`
    );
    if (!confirmed) return;

    setAdminMessage(null);
    try {
      if (isAdmin) {
        await deleteTrailMutation.mutateAsync();
      } else {
        await hideTrailMutation.mutateAsync();
      }
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


  const getInitialZoom = (bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }) => {
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
  };

  const downloadGpx = (trailName: string, data: RouteData) => {
    const esc = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
    const trkpts = data.coordinates
      .map((point) => {
        const eleTag =
          typeof point.elevation === 'number'
            ? `<ele>${point.elevation.toFixed(1)}</ele>`
            : '';
        return `<trkpt lat="${point.latitude}" lon="${point.longitude}">${eleTag}</trkpt>`;
      })
      .join('');
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MTB Trail Finder" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${esc(trailName)}</name>
    <trkseg>${trkpts}</trkseg>
  </trk>
</gpx>`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${trailName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="animate-pulse">
          <div className="mb-6 h-9 w-2/3 rounded bg-gray-200 sm:h-10 sm:w-1/2" />
          <div className="mb-5 h-5 w-1/3 rounded bg-gray-200" />
          <div className="mb-6 flex flex-wrap gap-2">
            <div className="h-7 w-24 rounded-full bg-gray-200" />
            <div className="h-7 w-24 rounded-full bg-gray-200" />
            <div className="h-7 w-24 rounded-full bg-gray-200" />
          </div>
          <div className="mb-6 h-[320px] w-full rounded-xl bg-gray-200 sm:h-[420px]" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="h-28 rounded-lg bg-gray-200 sm:h-32" />
            <div className="h-28 rounded-lg bg-gray-200 sm:h-32" />
            <div className="h-28 rounded-lg bg-gray-200 sm:h-32" />
            <div className="h-28 rounded-lg bg-gray-200 sm:h-32" />
          </div>
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
  const trailImages = [trail.image_url, ...(trail.trail_images || [])]
    .filter((image): image is string => Boolean(image))
    .filter((image, index, arr) => arr.indexOf(image) === index);
  // const elevationData = hasRoute && routeData ? getElevationData(routeData) : [];

  // Determine map center and zoom
  let mapCenter = { longitude: 0, latitude: 0, zoom: 2 };
  if (mapBounds) {
    mapCenter = {
      longitude: mapBounds.centerLon,
      latitude: mapBounds.centerLat,
      zoom: getInitialZoom(mapBounds),
    };
  } else if (hasLocation) {
    mapCenter = {
      longitude: trail.longitude!,
      latitude: trail.latitude!,
      zoom: 14,
    };
  }

  const copyTrailLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setActionMessage('Trail link copied.');
      setTimeout(() => setActionMessage(null), 2000);
    } catch {
      setActionMessage('Unable to copy link.');
      setTimeout(() => setActionMessage(null), 2000);
    }
  };

  const handleBackToTrails = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/trails', { scroll: false });
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24 sm:py-8 sm:pb-8">
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToTrails}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back to trails
          </button>
          <button
            type="button"
            onClick={copyTrailLink}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Share
          </button>
        </div>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-green-800 sm:text-4xl">{trail.name}</h1>
              {trail.status === 'pending' && (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Pending
                </span>
              )}
            </div>
            <p className="text-gray-600">{trail.location}</p>
            <p className="mt-1 text-xs text-gray-500">
              Added by{' '}
              <span className="font-semibold text-gray-700">
                {(trail.submitted_by_name || trail.expert_name || trail.created_by || '').trim() ||
                  'LocoXperts'}
              </span>
              {trail.submitted_by_email ? ` (${trail.submitted_by_email})` : ''}
            </p>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-stretch gap-2">
          {canUploadRoute && (
            <label className="w-full cursor-pointer rounded-lg bg-green-700 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-green-800 sm:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploading ? 'Uploading...' : 'Upload GPX Route'}
            </label>
          )}
          {trailImages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveImageIndex(0);
                setGalleryModalOpen(true);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 sm:w-auto"
            >
              View Trail Photos
            </button>
          )}
          {hasRoute && routeData && (
            <button
              type="button"
              onClick={() => downloadGpx(trail.name, routeData)}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
            >
              Download GPX
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => router.push(`/trails/create?trailId=${trailId}`)}
              className="w-full rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100 sm:w-auto"
            >
              Edit Trail
            </button>
          )}
          {(currentUser?.role === 'admin' || currentUser?.role === 'expert') && (
            <button
              type="button"
              onClick={() => setCreateEventOpen(true)}
              className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 sm:w-auto"
            >
              Create Event
            </button>
          )}
          {canRequestTrail && (
            <button
              type="button"
              disabled={loadingCurrentUser}
              onClick={() => {
                if (loadingCurrentUser) {
                  setRequestMessage('Checking your account. Please try again in a second.');
                  return;
                }
                if (!currentUser) {
                  router.push('/register');
                  return;
                }
                setRequestMessage(null);
                setRequestModalOpen(true);
              }}
              className="w-full rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Request This Trail
            </button>
          )}
          {uploadSuccess && (
            <span className="text-sm text-green-600">Route uploaded successfully.</span>
          )}
          {uploadError && <span className="text-sm text-red-600">{uploadError}</span>}
          {actionMessage && <span className="text-sm text-gray-600">{actionMessage}</span>}
          {requestMessage && <span className="text-sm text-gray-600">{requestMessage}</span>}
        </div>

        {trail.description && (
          <p className="text-gray-700 mb-4">{trail.description}</p>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <span className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-800 text-center">
            {trail.difficulty}
          </span>
          {trail.sport_type && (
            <span className="rounded-lg bg-sky-100 px-3 py-2 text-center text-sm text-sky-800">
              {getSportLabel(trail.sport_type)}
            </span>
          )}
          {routeData?.totalDistance ? (
            <span className="rounded-lg bg-blue-100 px-3 py-2 text-center text-sm text-blue-800">
              Distance: {routeData.totalDistance.toFixed(2)} km
            </span>
          ) : trail.distance_km ? (
            <span className="rounded-lg bg-blue-100 px-3 py-2 text-center text-sm text-blue-800">
              Distance: {trail.distance_km} km
            </span>
          ) : null}
          {routeData?.elevationGain ? (
            <span className="rounded-lg bg-purple-100 px-3 py-2 text-center text-sm text-purple-800">
              Elevation gain: +{routeData.elevationGain.toFixed(0)} m ↑
            </span>
          ) : trail.elevation_gain_m ? (
            <span className="rounded-lg bg-purple-100 px-3 py-2 text-center text-sm text-purple-800">
              Elevation gain: {trail.elevation_gain_m} m
            </span>
          ) : null}
          {routeData?.elevationLoss ? (
            <span className="rounded-lg bg-red-100 px-3 py-2 text-center text-sm text-red-800">
              Elevation loss: -{routeData.elevationLoss.toFixed(0)} m ↓
            </span>
          ) : null}
          {trail.estimated_time_hours && (
            <span className="rounded-lg bg-orange-100 px-3 py-2 text-center text-sm text-orange-800">
              Estimated time: ~{trail.estimated_time_hours} hours
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

        {canManageTrail && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h2 className="mb-2 text-base font-semibold text-gray-900">
              Safety Labels
            </h2>
            <p className="mb-3 text-sm text-gray-600">
              Update safety labels and manage this trail.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {TRAIL_SAFETY_OPTIONS.map((option) => {
                const selected = safetyDraft.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleSafetyLabel(option.value)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      selected
                        ? 'border-amber-600 bg-amber-500 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-amber-400'
                    }`}
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
                disabled={deleteTrailMutation.isPending || hideTrailMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleteTrailMutation.isPending || hideTrailMutation.isPending
                  ? 'Deleting...'
                  : 'Delete Trail'}
              </button>
            </div>
            {adminMessage && (
              <p className="mt-2 text-sm text-gray-700">{adminMessage}</p>
            )}
          </div>
        )}

      </div>

      {hasRoute ? (
        <div className="mb-6 h-[360px] w-full overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-[0_20px_60px_-25px_rgba(2,6,23,0.8)] sm:h-[460px] lg:h-[600px]">
          <Map
            initialViewState={mapCenter}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
          >
            <div className="absolute left-3 top-3 z-10 inline-flex overflow-hidden rounded-lg border border-white/15 bg-slate-950/70 shadow-lg backdrop-blur">
              <button
                type="button"
                aria-pressed={mapStyleMode === 'satellite'}
                onClick={() => setMapStyleMode('satellite')}
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
                onClick={() => setMapStyleMode('map')}
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
                    'line-width': 10,
                    'line-opacity': 0.25,
                    'line-blur': 1.2,
                  }}
                />
                <Layer
                  id="route-line-casing"
                  type="line"
                  paint={{
                    'line-color': '#064e3b',
                    'line-width': 6.5,
                    'line-opacity': 0.9,
                  }}
                />
                <Layer
                  id="route-line-core"
                  type="line"
                  paint={{
                    'line-color': '#34d399',
                    'line-width': 4.5,
                    'line-opacity': 0.98,
                  }}
                />
                <Layer
                  id="route-line-highlight"
                  type="line"
                  paint={{
                    'line-color': '#ecfeff',
                    'line-width': 1.1,
                    'line-opacity': 0.9,
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
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-600">
            No GPX route has been uploaded for this trail yet.
          </p>
        </div>
      )}

      {trailImages.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Trail Photos</h2>
            <button
              type="button"
              onClick={() => {
                setActiveImageIndex(0);
                setGalleryModalOpen(true);
              }}
              className="text-sm font-medium text-green-700 hover:text-green-800"
            >
              Open Gallery
            </button>
          </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {trailImages.slice(0, 4).map((imageUrl, index) => (
                <button
                key={`${imageUrl}-${index}`}
                type="button"
                onClick={() => {
                  setActiveImageIndex(index);
                  setGalleryModalOpen(true);
                }}
                  className="relative h-32 overflow-hidden rounded-lg ring-offset-2 transition hover:scale-[1.01] hover:ring-2 hover:ring-green-400"
                >
                <Image
                  src={imageUrl}
                  alt={`${trail.name} trail photo ${index + 1}`}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-3 left-1/2 z-40 flex w-[94vw] -translate-x-1/2 gap-2 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:hidden">
        {(currentUser?.role === 'admin' || currentUser?.role === 'expert') && (
          <button
            type="button"
            onClick={() => setCreateEventOpen(true)}
            className="flex-1 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800"
          >
            Create
          </button>
        )}
        {trailImages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveImageIndex(0);
              setGalleryModalOpen(true);
            }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800"
          >
            Photos
          </button>
        )}
        {hasRoute && routeData && (
          <button
            type="button"
            onClick={() => downloadGpx(trail.name, routeData)}
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
          >
            GPX
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (loadingCurrentUser) return;
            if (!currentUser) {
              router.push('/register');
              return;
            }
            setRequestMessage(null);
            setRequestModalOpen(true);
          }}
          className="flex-1 rounded-lg border border-green-700 px-3 py-2 text-xs font-semibold text-green-700"
        >
          Request
        </button>
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
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Select Expert
              </label>
              <select
                value={selectedExpertId}
                onChange={(e) => setSelectedExpertId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Choose expert</option>
                {experts.map((expert) => (
                  <option key={expert.id} value={expert.id}>
                    {expert.name || expert.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preferred Date
              </label>
              <input
                type="date"
                value={preferredDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <textarea
              value={requestDescription}
              onChange={(e) => setRequestDescription(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                  if (!selectedExpertId) {
                    setRequestMessage('Please select an expert.');
                    return;
                  }
                  if (!preferredDate) {
                    setRequestMessage('Please select a preferred date.');
                    return;
                  }
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

      <Dialog.Root open={createEventOpen} onOpenChange={setCreateEventOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[88vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <Dialog.Title className="truncate pr-2 text-sm font-semibold text-gray-900">
                Create Event For This Trail
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">
                Close
              </Dialog.Close>
            </div>
            <div className="h-[calc(88vh-52px)] overflow-y-auto p-4">
              <EventForm
                mode="create"
                lockTrailAndSport
                embedded
                initialUser={currentUser ?? null}
                prefillTrailId={trail.id}
                prefillTrail={trail}
                prefillSport={(trail.sport_type || 'mtb') as SportType}
                onCompleted={() => {
                  setCreateEventOpen(false);
                  setActionMessage('Event created successfully.');
                  setTimeout(() => setActionMessage(null), 2500);
                }}
                onCancel={() => setCreateEventOpen(false)}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={replaceConfirmOpen}
        onOpenChange={(open) => {
          setReplaceConfirmOpen(open);
          if (!open) {
            setPendingGpxFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Replace Existing GPX?
            </Dialog.Title>
            <p className="mt-2 text-sm text-gray-600">
              A GPX route already exists. Uploading this file will replace the current route.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplaceConfirmOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!pendingGpxFile) return;
                  setReplaceConfirmOpen(false);
                  await performRouteUpload(pendingGpxFile);
                  setPendingGpxFile(null);
                }}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Confirm Replace
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={galleryModalOpen} onOpenChange={setGalleryModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-slate-950 p-3 sm:p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold text-white">
                {trail.name} Gallery
              </Dialog.Title>
              <Dialog.Close className="rounded border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10">
                Close
              </Dialog.Close>
            </div>
            {trailImages.length > 0 && (
              <>
                <div className="relative h-[60vh] w-full">
                  <Image
                    src={trailImages[activeImageIndex]}
                    alt={`${trail.name} photo ${activeImageIndex + 1}`}
                    fill
                    unoptimized
                    sizes="95vw"
                    className="rounded-lg object-contain"
                  />
                  {trailImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === 0 ? trailImages.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
                        aria-label="Previous photo"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === trailImages.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
                        aria-label="Next photo"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
                {trailImages.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {trailImages.map((imageUrl, index) => (
                      <button
                        key={`thumb-${imageUrl}-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded border ${index === activeImageIndex ? 'border-green-500' : 'border-white/20'}`}
                      >
                        <Image
                          src={imageUrl}
                          alt={`${trail.name} thumbnail ${index + 1}`}
                          width={96}
                          height={64}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
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
