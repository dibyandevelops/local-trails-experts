'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Map, {
  FullscreenControl,
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as Dialog from '@radix-ui/react-dialog';
import { Trail, RouteData, User, SportType, TrailReview } from '@/types';
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
import { fetchTrailReviews, submitTrailReview } from '@/services/reviews/reviews.service';
import {
  deleteTrail,
  fetchTrailById,
  hideTrail,
  requestTrail,
  removeTrailRoute,
  updateTrail,
  uploadTrailRoute,
} from '@/services/trails/trails.service';
import EventForm from '@/components/feature-components/event-form/event-form';
import { getMapStyle, type MapStyleMode } from '@/lib/map-styles';
import { resizeImageToDataUrl } from '@/lib/image';
import DateText from '@/components/ui/date-text';

const TRAILS_LAST_URL_KEY = 'trails_last_url';

type GeoJSON = {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
} | null;
type MapSectionProps = {
  hasRoute: boolean;
  routeGeoJSON: GeoJSON;
  routeData: RouteData | null;
  mapCenter: { longitude: number; latitude: number; zoom: number };
  mapStyle: string;
  mapStyleMode: MapStyleMode;
  onStyleModeChange: (mode: MapStyleMode) => void;
};

const MapSection = React.memo(function MapSection({
  hasRoute,
  routeGeoJSON,
  routeData,
  mapCenter,
  mapStyle,
  mapStyleMode,
  onStyleModeChange,
}: MapSectionProps) {
  const mapRef = React.useRef<MapRef | null>(null);
  return hasRoute ? (
    <div className="mb-6 h-[360px] w-full overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-[0_20px_60px_-25px_rgba(2,6,23,0.8)] sm:h-[460px] lg:h-[600px]">
      <Map
        ref={mapRef}
        initialViewState={mapCenter}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
      >
        <div className="absolute left-3 top-3 z-10 inline-flex overflow-hidden rounded-lg border border-white/15 bg-slate-950/70 shadow-lg backdrop-blur">
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
                  'text-size': 24,
                  'text-rotation-alignment': 'map',
                  'text-keep-upright': false,
                  'text-offset': [0, 0],
                  'text-allow-overlap': true,
                  'text-ignore-placement': true,
                }}
                paint={{
                  'text-color': '#16a34a',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 1.6,
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
      <p className="text-gray-600">No GPX route has been uploaded for this trail yet.</p>
    </div>
  );
});

const TrailPage: React.FunctionComponent = () => {
  const router = useRouter();
  const params = useParams();
  const trailId = params?.id as string;
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: loadingCurrentUser } = useCurrentUser();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadMessage, setPhotoUploadMessage] = useState<string | null>(null);
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
  const [requestAcceptTerms, setRequestAcceptTerms] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [safetyDraft, setSafetyDraft] = useState<TrailSafetyLabel[]>([]);
  const [hazardousDraft, setHazardousDraft] = useState(false);
  const [hazardNoteDraft, setHazardNoteDraft] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAcceptTerms, setReviewAcceptTerms] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>(() => {
    if (typeof window === 'undefined') return 'map';
    const saved = window.localStorage.getItem('mtb_map_style_mode');
    return saved === 'map' || saved === 'satellite' ? saved : 'map';
  });
  const mapStyle = useMemo(() => getMapStyle(mapStyleMode), [mapStyleMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem('mtb_map_style_mode', mapStyleMode);
    } catch {
      // ignore
    }
  }, [mapStyleMode]);

  useEffect(() => {
    const closeTransientUi = () => {
      setRequestModalOpen(false);
      setGalleryModalOpen(false);
      setCreateEventOpen(false);
      setReplaceConfirmOpen(false);
      setPendingGpxFile(null);
      setAdminMessage(null);
      setActionMessage(null);
      setRequestAcceptTerms(false);
    };
    window.addEventListener('pageshow', closeTransientUi);
    return () => window.removeEventListener('pageshow', closeTransientUi);
  }, []);

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

  const { data: reviewData, isLoading: loadingReviews } = useQuery<{
    reviews: TrailReview[];
    summary: { averageRating: number; count: number };
  }>({
    queryKey: QUERY_KEYS.trails.reviews(trailId),
    queryFn: ({ signal }) => fetchTrailReviews(trailId, signal),
    enabled: Boolean(trailId),
  });

  const hasLocation = trail?.latitude != null && trail?.longitude != null;
  const routeData = (trail?.route_data as RouteData | null) ?? null;
  const hasRoute = useMemo(
    () => Boolean(routeData && routeData.coordinates && routeData.coordinates.length > 0),
    [routeData]
  );
  const mapBounds = useMemo(
    () => (hasRoute && routeData ? getMapBounds(routeData) : null),
    [hasRoute, routeData]
  );
  const routeGeoJSON = useMemo(
    () => (hasRoute && routeData ? getRouteGeoJSON(routeData) : null),
    [hasRoute, routeData]
  );
  const trailImages = useMemo(
    () =>
      [trail?.image_url, ...(trail?.trail_images || [])]
        .filter((image): image is string => Boolean(image))
        .filter((image, index, arr) => arr.indexOf(image) === index),
    [trail?.image_url, trail?.trail_images]
  );
  const mapCenter = useMemo(() => {
    if (mapBounds) {
      return {
        longitude: mapBounds.centerLon,
        latitude: mapBounds.centerLat,
        zoom: getInitialZoom(mapBounds),
      };
    }
    if (hasLocation && trail?.longitude != null && trail?.latitude != null) {
      return {
        longitude: trail.longitude,
        latitude: trail.latitude,
        zoom: 14,
      };
    }
    return { longitude: 0, latitude: 0, zoom: 2 };
  }, [mapBounds, hasLocation, trail?.latitude, trail?.longitude]);

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
  }, [galleryModalOpen, trailImages.length]);

  useEffect(() => {
    if (!trail) return;
    setSafetyDraft((trail.safety_labels || []) as TrailSafetyLabel[]);
    setHazardousDraft(Boolean(trail.is_hazardous));
    setHazardNoteDraft(trail.hazard_note || '');
  }, [trail]);

  const existingReview = useMemo(
    () =>
      reviewData?.reviews?.find((review) => review.reviewer_user_id === currentUser?.id) ||
      null,
    [reviewData?.reviews, currentUser?.id]
  );

  useEffect(() => {
    if (!existingReview) {
      setReviewRating(5);
      setReviewComment('');
      return;
    }
    setReviewRating(existingReview.rating || 5);
    setReviewComment(existingReview.comment || '');
  }, [existingReview?.id]);

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

  const reviewMutation = useMutation({
    mutationFn: (payload: { rating: number; comment?: string }) =>
      submitTrailReview(trailId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trails.reviews(trailId) });
      setReviewMessage('Review submitted. Thanks for the feedback!');
      setReviewAcceptTerms(false);
    },
    onError: (error) => {
      setReviewMessage(error instanceof Error ? error.message : 'Failed to submit review.');
    },
  });

  const removeRouteMutation = useMutation({
    mutationFn: () => removeTrailRoute(trailId),
    onSuccess: (updatedTrail) => {
      queryClient.setQueryData(QUERY_KEYS.trails.byId(trailId), updatedTrail);
      setAdminMessage('GPX route removed.');
    },
    onError: (error) => {
      setAdminMessage(error instanceof Error ? error.message : 'Failed to remove route.');
    },
  });

  const deleteTrailMutation = useMutation({
    mutationFn: () => deleteTrail(trailId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.trails.byId(trailId) });
      queryClient.invalidateQueries({ queryKey: ['trails'] });
      queryClient.invalidateQueries({ queryKey: ['trails-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['trails-infinite'] });
      const lastListUrl = sessionStorage.getItem(TRAILS_LAST_URL_KEY);
      router.push(lastListUrl || '/trails', { scroll: false });
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
  const canFlagHazard = currentUser?.role === 'admin' || currentUser?.role === 'expert';
  const canUploadPhotos = canManageTrail;
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadPhotos || !trail) return;
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/')
    );
    if (files.length === 0) return;
    setPhotoUploadMessage(null);
    setPhotoUploading(true);
    try {
      const newImages = await Promise.all(files.map((file) => resizeImageToDataUrl(file)));
      const merged = [...trailImages, ...newImages].filter(Boolean);
      const unique = merged.filter((image, index, arr) => arr.indexOf(image) === index);
      await updateTrailMutation.mutateAsync({
        image_url: unique[0] || null,
        trail_images: unique,
      });
      setPhotoUploadMessage('Trail photos updated.');
      if (event.target) {
        event.target.value = '';
      }
    } catch (error) {
      setPhotoUploadMessage(
        error instanceof Error ? error.message : 'Failed to upload trail photos'
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  // Calculate map bounds from route coordinates
  function getMapBounds(routeData: RouteData) {
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
  }

  // Convert route coordinates to GeoJSON LineString
  function getRouteGeoJSON(routeData: RouteData) {
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
          <div className="mb-6 h-9 w-2/3 rounded bg-gray-200 sm:h-10 sm:w-1/2 dark:bg-slate-800" />
          <div className="mb-5 h-5 w-1/3 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mb-6 flex flex-wrap gap-2">
            <div className="h-7 w-24 rounded-full bg-gray-200 dark:bg-slate-800" />
            <div className="h-7 w-24 rounded-full bg-gray-200 dark:bg-slate-800" />
            <div className="h-7 w-24 rounded-full bg-gray-200 dark:bg-slate-800" />
          </div>
          <div className="mb-6 h-[320px] w-full rounded-xl bg-gray-200 sm:h-[420px] dark:bg-slate-800" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="h-28 rounded-lg bg-gray-200 sm:h-32 dark:bg-slate-800" />
            <div className="h-28 rounded-lg bg-gray-200 sm:h-32 dark:bg-slate-800" />
            <div className="h-28 rounded-lg bg-gray-200 sm:h-32 dark:bg-slate-800" />
            <div className="h-28 rounded-lg bg-gray-200 sm:h-32 dark:bg-slate-800" />
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

  // const elevationData = hasRoute && routeData ? getElevationData(routeData) : [];

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
    const lastListUrl = sessionStorage.getItem(TRAILS_LAST_URL_KEY);
    if (lastListUrl) {
      router.push(lastListUrl, { scroll: false });
      return;
    }
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/trails', { scroll: false });
  };
  const showActionsSection = Boolean(
    canUploadRoute ||
      (currentUser?.role === 'admin' && hasRoute) ||
      trailImages.length > 0 ||
      canUploadPhotos ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'expert' ||
      canRequestTrail ||
      uploadSuccess ||
      uploadError ||
      photoUploadMessage ||
      actionMessage ||
      requestMessage
  );

  const reviewSummary = reviewData?.summary || { averageRating: 0, count: 0 };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={`star-${index}`} className="text-sm">
          {index < Math.round(rating) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 pb-24 sm:py-8 sm:pb-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBackToTrails}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          ← Back to trails
        </button>
        <button
          type="button"
          onClick={copyTrailLink}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Share
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/30" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />

        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900 dark:bg-slate-900/60 dark:text-emerald-200">
                Nepal Trail Network
              </span>
              <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900 dark:bg-slate-900/60 dark:text-emerald-200">
                Trail profile
              </span>
              {trail.status === 'pending' && (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  Pending
                </span>
              )}
              {trail.is_hazardous && (
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                  Hazardous
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-green-800 sm:text-4xl dark:text-green-200">
              {trail.name}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{trail.location}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Added by{' '}
              <span className="font-semibold text-gray-700 dark:text-slate-200">
                {(trail.submitted_by_name || trail.expert_name || trail.created_by || '').trim() ||
                  'LocoXperts'}
              </span>
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {trail.sport_type && (
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
                  {getSportLabel(trail.sport_type)}
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                {trail.difficulty}
              </span>
            </div>

            {trail.description && (
              <p className="mt-4 text-sm text-gray-700 dark:text-slate-200">
                {trail.description}
              </p>
            )}

            {trail.is_hazardous && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-200">
                  Hazard alert
                </p>
                <p className="mt-1 text-sm font-semibold">
                  This trail is currently marked hazardous.
                </p>
                {trail.hazard_note && (
                  <p className="mt-1 text-xs text-rose-800 dark:text-rose-200">
                    {trail.hazard_note}
                  </p>
                )}
              </div>
            )}

            {!!trail.safety_labels?.length && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Safety recommendations
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {trail.safety_labels.map((label) => (
                    <span
                      key={`${trail.id}-safe-${label}`}
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      {getSafetyLabelText(label)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200/70 bg-white/90 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Trail metrics
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(routeData?.totalDistance || trail.distance_km) && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-center text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
                    <div className="uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      Distance
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {routeData?.totalDistance
                        ? `${routeData.totalDistance.toFixed(2)} km`
                        : `${trail.distance_km} km`}
                    </div>
                  </div>
                )}
                {(routeData?.elevationGain || trail.elevation_gain_m) && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-3 text-center text-xs text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-100">
                    <div className="uppercase tracking-wide text-purple-700 dark:text-purple-300">
                      Elevation gain
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {routeData?.elevationGain
                        ? `+${routeData.elevationGain.toFixed(0)} m`
                        : `${trail.elevation_gain_m} m`}
                    </div>
                  </div>
                )}
                {routeData?.elevationLoss && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-center text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100">
                    <div className="uppercase tracking-wide text-rose-700 dark:text-rose-300">
                      Elevation loss
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      -{routeData.elevationLoss.toFixed(0)} m
                    </div>
                  </div>
                )}
                {trail.estimated_time_hours && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-center text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    <div className="uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      Estimated time
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      ~{trail.estimated_time_hours} hrs
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showActionsSection && (
              <div className="rounded-2xl border border-emerald-200/70 bg-white/90 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  Actions
                </p>
                <div className="mt-3 flex flex-wrap items-stretch gap-2">
                  {canUploadRoute && (
                    <label className="w-full cursor-pointer rounded-full bg-green-700 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-green-800 sm:w-auto">
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
                  {currentUser?.role === 'admin' && hasRoute && (
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = window.confirm('Remove the GPX route for this trail?');
                        if (!confirmed) return;
                        await removeRouteMutation.mutateAsync();
                      }}
                      disabled={removeRouteMutation.isPending}
                      className="w-full rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 sm:w-auto disabled:opacity-60"
                    >
                      {removeRouteMutation.isPending ? 'Removing...' : 'Remove GPX Route'}
                    </button>
                  )}
                  {trailImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveImageIndex(0);
                        setGalleryModalOpen(true);
                      }}
                      className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      View Trail Photos
                    </button>
                  )}
                  {canUploadPhotos && (
                    <label className="w-full cursor-pointer rounded-full border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      {photoUploading ? 'Uploading Photos...' : 'Upload Trail Photos'}
                    </label>
                  )}
                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => router.push(`/trails/create?trailId=${trailId}`)}
                      className="w-full rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100 sm:w-auto"
                    >
                      Edit Trail
                    </button>
                  )}
                  {(currentUser?.role === 'admin' || currentUser?.role === 'expert') && (
                    <button
                      type="button"
                      onClick={() => setCreateEventOpen(true)}
                      className="w-full rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 sm:w-auto"
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
                          const next =
                            typeof window !== 'undefined'
                              ? `${window.location.pathname}${window.location.search}`
                              : `/trails/${trail.id}`;
                          window.dispatchEvent(
                            new CustomEvent('open-register', {
                              detail: {
                                message: 'Create a participant account to request a trail activity.',
                                next,
                              },
                            })
                          );
                          return;
                        }
                        setRequestMessage(null);
                        setRequestModalOpen(true);
                      }}
                      className="w-full rounded-full border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      Request This Trail
                    </button>
                  )}
                </div>

                {(uploadSuccess ||
                  uploadError ||
                  photoUploadMessage ||
                  actionMessage ||
                  requestMessage) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {uploadSuccess && (
                      <span className="text-green-600">Route uploaded successfully.</span>
                    )}
                    {uploadError && <span className="text-red-600">{uploadError}</span>}
                    {photoUploadMessage && (
                      <span className="text-gray-600">{photoUploadMessage}</span>
                    )}
                    {actionMessage && <span className="text-gray-600">{actionMessage}</span>}
                    {requestMessage && <span className="text-gray-600">{requestMessage}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {canManageTrail && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                Safety Labels
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Update safety labels and manage this trail.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
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
                      : 'border-gray-300 bg-white text-gray-700 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
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
                    err instanceof Error ? err.message : 'Failed to update sport type'
                  );
                }
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
            <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">{adminMessage}</p>
          )}
        </section>
      )}

      {canFlagHazard && (
        <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-200">
                Hazard status
              </p>
              <p className="text-sm text-rose-900 dark:text-rose-100">
                Mark this trail hazardous when conditions are unsafe.
              </p>
            </div>
            <span className="rounded-full border border-rose-200 bg-white/70 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-200">
              {hazardousDraft ? 'Currently hazardous' : 'Marked safe'}
            </span>
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs text-rose-900 dark:text-rose-100">
            <input
              type="checkbox"
              checked={hazardousDraft}
              onChange={(event) => setHazardousDraft(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
            />
            <span>Flag this trail as hazardous</span>
          </label>
          <textarea
            value={hazardNoteDraft}
            onChange={(event) => setHazardNoteDraft(event.target.value)}
            rows={2}
            className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
            placeholder="Optional: brief hazard details (landslide, damaged bridge, heavy traffic)."
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await updateTrailMutation.mutateAsync({
                    is_hazardous: hazardousDraft,
                    hazard_note: hazardNoteDraft.trim() || null,
                  });
                  setAdminMessage('Hazard status updated.');
                } catch (err) {
                  setAdminMessage(
                    err instanceof Error ? err.message : 'Failed to update hazard status.'
                  );
                }
              }}
              disabled={updateTrailMutation.isPending}
              className="rounded-lg border border-rose-300 bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateTrailMutation.isPending ? 'Saving...' : 'Update Hazard Status'}
            </button>
            <button
              type="button"
              onClick={() => {
                setHazardousDraft(Boolean(trail.is_hazardous));
                setHazardNoteDraft(trail.hazard_note || '');
                setAdminMessage('Hazard status reset.');
              }}
              className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
            >
              Reset
            </button>
          </div>
        </section>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Trail route
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Map & elevation context
            </h2>
          </div>
        </div>
        <MapSection
          hasRoute={hasRoute}
          routeGeoJSON={routeGeoJSON}
          routeData={routeData}
          mapCenter={mapCenter}
          mapStyle={mapStyle}
          mapStyleMode={mapStyleMode}
          onStyleModeChange={setMapStyleMode}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Reviews
            </p>
            <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
              Trail ratings & feedback
            </h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                {reviewSummary.averageRating.toFixed(1)}
              </span>
              {renderStars(reviewSummary.averageRating)}
              <span>({reviewSummary.count} reviews)</span>
            </div>
          </div>
          {currentUser ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              {existingReview ? 'Update your review' : 'Leave a review'}
            </span>
          ) : (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Log in to review
            </span>
          )}
        </div>

        {currentUser && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setReviewMessage(null);
              if (!reviewAcceptTerms) {
                setReviewMessage('Please accept the terms before submitting your review.');
                return;
              }
              await reviewMutation.mutateAsync({
                rating: reviewRating,
                comment: reviewComment,
              });
            }}
            className="mt-4 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30"
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Rating
              </label>
              <select
                value={reviewRating}
                onChange={(event) => setReviewRating(Number(event.target.value))}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-slate-100"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={`trail-rating-${value}`} value={value}>
                    {value} star{value > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              {renderStars(reviewRating)}
            </div>
            <textarea
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Share what riders should expect on this trail."
            />
            <label className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-200">
              <input
                type="checkbox"
                checked={reviewAcceptTerms}
                onChange={(event) => setReviewAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                I agree to the{' '}
                <a href="/terms" className="font-semibold text-emerald-700 hover:underline">
                  Terms &amp; Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" className="font-semibold text-emerald-700 hover:underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {reviewMessage && (
              <p className="text-xs text-emerald-800 dark:text-emerald-200">{reviewMessage}</p>
            )}
            <button
              type="submit"
              disabled={reviewMutation.isPending || !reviewAcceptTerms}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reviewMutation.isPending ? 'Saving...' : existingReview ? 'Update Review' : 'Submit Review'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {loadingReviews ? (
            <p className="text-sm text-gray-500 dark:text-slate-300">Loading reviews...</p>
          ) : reviewData?.reviews?.length ? (
            reviewData.reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {review.reviewer_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.reviewer_photo_url}
                          alt={review.reviewer_name || 'Reviewer'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          {(review.reviewer_name || 'R')
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {review.reviewer_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        <DateText value={review.created_at} pattern="PPP" />
                      </p>
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm text-gray-700 dark:text-slate-200">
                    {review.comment}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-300">
              No reviews yet. Be the first to share your experience.
            </p>
          )}
        </div>
      </section>

      {trailImages.length > 0 && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trail Photos</h2>
            <button
              type="button"
              onClick={() => {
                setActiveImageIndex(0);
                setGalleryModalOpen(true);
              }}
              className="text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
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
                className="relative h-32 overflow-hidden rounded-lg ring-offset-2 transition hover:scale-[1.01] hover:ring-2 hover:ring-green-400 dark:ring-offset-slate-900"
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
          null
        )}
        <button
          type="button"
          onClick={() => {
            if (loadingCurrentUser) return;
            if (!currentUser) {
              const next =
                typeof window !== 'undefined'
                  ? `${window.location.pathname}${window.location.search}`
                  : `/trails/${trail.id}`;
              window.dispatchEvent(
                new CustomEvent('open-register', {
                  detail: {
                    message: 'Create a participant account to request a trail activity.',
                    next,
                  },
                })
              );
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
            <label className="mt-3 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <input
                type="checkbox"
                checked={requestAcceptTerms}
                onChange={(event) => setRequestAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
              />
              <span>
                I acknowledge outdoor activities involve risk and I agree to follow the
                expert’s safety instructions.
              </span>
            </label>
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
                  if (!requestAcceptTerms) {
                    setRequestMessage('Please accept the risk acknowledgment.');
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
                disabled={requestTrailMutation.isPending || !requestAcceptTerms}
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

    </div>
  );
};

export default TrailPage;
