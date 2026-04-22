'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import * as Dialog from '@radix-ui/react-dialog';
import { Trail, RouteData, User, SportType, TrailReview } from '@/types';
import {
  getSafetyLabelText,
  TRAIL_SAFETY_OPTIONS,
  type TrailSafetyLabel,
} from '@/lib/trail-safety';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getSportLabel, TRAIL_SPORTS } from '@/services/constants/sports';
import { extractKomootEmbedUrl, getKomootNavigateUrl } from '@/lib/komoot';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { fetchVerifiedExperts } from '@/services/events/events.service';
import { fetchTrailReviews, submitTrailReview } from '@/services/reviews/reviews.service';
import { fetchMyParticipantEvents } from '@/services/participants/participants.service';
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
import TrailImageCarouselModal from '@/components/ui/trail-image-carousel-modal';
import ThemedDropdown, { type ThemedDropdownItem } from '@/components/ui/themed-dropdown';
import AppDialog from '@/components/ui/app-dialog';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

const TRAILS_LAST_URL_KEY = 'trails_last_url';

type TrailPageClientProps = {
  trailId: string;
  initialTrail: Trail | null;
};

type GeoJSON = {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
} | null;

type ParticipantTrailRequest = {
  id: string;
  trail_id: string;
};
type MapSectionProps = {
  hasRoute: boolean;
  routeGeoJSON: GeoJSON;
  routeData: RouteData | null;
  mapCenter: { longitude: number; latitude: number; zoom: number };
  mapStyle: string;
  mapStyleMode: MapStyleMode;
  mapboxToken?: string;
  onStyleModeChange: (mode: MapStyleMode) => void;
  komootEmbedUrl?: string | null;
};

const MapSection = React.memo(function MapSection({
  hasRoute,
  routeGeoJSON,
  routeData,
  mapCenter,
  mapStyle,
  mapStyleMode,
  mapboxToken,
  onStyleModeChange,
  komootEmbedUrl,
}: MapSectionProps) {
  const mapRef = React.useRef<MapRef | null>(null);
  const komootUrl = (komootEmbedUrl || '').trim();
  const normalizedKomootEmbedUrl = extractKomootEmbedUrl(komootUrl);
  const hasKomootEmbed = Boolean(normalizedKomootEmbedUrl);
  const komootOpenUrl = getKomootNavigateUrl(normalizedKomootEmbedUrl);

  if (hasKomootEmbed) {
    return (
      <div className="mb-6 overflow-hidden rounded-xl border border-emerald-200/60 bg-white shadow-[0_20px_60px_-25px_rgba(2,6,23,0.5)] dark:border-emerald-900/60 dark:bg-slate-950">
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
          <span>
            Having trouble loading? Open the route directly on Komoot.
          </span>
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
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <p className="text-gray-600">No GPX route has been uploaded for this trail yet.</p>
    </div>
  );
});

const TrailPageClient: React.FunctionComponent<TrailPageClientProps> = ({
  trailId,
  initialTrail,
}) => {
  const router = useRouter();
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
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [requestDescription, setRequestDescription] = useState('');
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [offeredPriceNpr, setOfferedPriceNpr] = useState('');
  const [nearestPoint, setNearestPoint] = useState('');
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
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [sportTypeDraft, setSportTypeDraft] = useState<Trail['sport_type']>('mtb');
  const [sportSafetyModalOpen, setSportSafetyModalOpen] = useState(false);
  const [hazardModalOpen, setHazardModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [coverUploadBusy, setCoverUploadBusy] = useState(false);
  const [coverMessage, setCoverMessage] = useState<string | null>(null);
  const [settingCoverImageUrl, setSettingCoverImageUrl] = useState<string | null>(null);
  const [deletingTrailImageUrl, setDeletingTrailImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>(() => {
    if (typeof window === 'undefined') return 'map';
    const saved = window.localStorage.getItem('mtb_map_style_mode');
    return saved === 'map' || saved === 'satellite' ? saved : 'map';
  });
  const mapStyle = useMemo(() => getMapStyle(mapStyleMode), [mapStyleMode]);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

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
      setReviewModalOpen(false);
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
    initialData: initialTrail ?? undefined,
  });

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
    enabled: !EXPERTS_BETA_ENABLED,
  });

  const { data: reviewData, isLoading: loadingReviews } = useQuery<{
    reviews: TrailReview[];
    summary: { averageRating: number; count: number };
  }>({
    queryKey: QUERY_KEYS.trails.reviews(trailId),
    queryFn: ({ signal }) => fetchTrailReviews(trailId, signal),
    enabled: Boolean(trailId),
  });
  const { data: joinedEvents = [] } = useQuery({
    queryKey: QUERY_KEYS.events.joinedByParticipant,
    queryFn: ({ signal }) => fetchMyParticipantEvents(signal),
    enabled: currentUser?.role === 'participant',
  });
  const { data: participantRequests = [], refetch: refetchParticipantRequests } = useQuery<
    ParticipantTrailRequest[]
  >({
    queryKey: ['participant-trail-requests', trailId, currentUser?.id],
    queryFn: async () => {
      const response = await fetch('/api/participants/me/trail-requests', {
        cache: 'no-store',
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data?.requests) ? data.requests : [];
    },
    enabled: currentUser?.role === 'participant' && Boolean(trailId),
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
  const komootNavigateUrl = useMemo(
    () => getKomootNavigateUrl(trail?.komoot_embed_url),
    [trail?.komoot_embed_url]
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
    if (!trail) return;
    setSafetyDraft((trail.safety_labels || []) as TrailSafetyLabel[]);
    setHazardousDraft(Boolean(trail.is_hazardous));
    setHazardNoteDraft(trail.hazard_note || '');
    setSportTypeDraft((trail.sport_type || 'mtb') as Trail['sport_type']);
  }, [trail]);

  const existingReview = useMemo(
    () =>
      reviewData?.reviews?.find((review) => review.reviewer_user_id === currentUser?.id) ||
      null,
    [reviewData?.reviews, currentUser?.id]
  );
  const canReviewTrail =
    currentUser?.role === 'admin' ||
    (currentUser?.role === 'participant' &&
      joinedEvents.some((event) => event.trail_id === trailId));

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
        expert_user_id: EXPERTS_BETA_ENABLED ? undefined : selectedExpertId,
        preferred_date: preferredDate,
        preferred_time: preferredTime || undefined,
        offered_price_npr:
          offeredPriceNpr.trim() === '' ? null : Number(offeredPriceNpr),
        nearest_point: nearestPoint.trim() || undefined,
      }),
    onSuccess: () => {
      setRequestMessage('Request sent to experts/admin successfully.');
      setRequestDescription('');
      setSelectedExpertId('');
      setPreferredDate('');
      setPreferredTime('');
      setOfferedPriceNpr('');
      setNearestPoint('');
      setRequestModalOpen(false);
      refetchParticipantRequests();
    },
  });
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/participants/me/trail-requests/${requestId}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to cancel request');
      }
      return data;
    },
    onSuccess: () => {
      setRequestMessage('Trail request cancelled.');
      refetchParticipantRequests();
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
  const canFlagHazard = currentUser?.role === 'admin' || currentUser?.role === 'expert';
  const canUploadPhotos = canManageTrail;
  const canCreateEvent = currentUser?.role === 'admin' || currentUser?.role === 'expert';
  const canRequestTrail = currentUser?.role === 'participant' || !currentUser;
  const existingTrailRequest = participantRequests.find((request) => request.trail_id === trailId);
  const hasRequestedTrail = Boolean(existingTrailRequest);
  const hasCreatedEventForRequestedTrail =
    hasRequestedTrail &&
    currentUser?.role === 'participant' &&
    joinedEvents.some((event) => event.trail_id === trailId);

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

  const handleDeleteTrailImage = async (imageUrl: string) => {
    if (!canManageTrail || !trail) return;
    setDeletingTrailImageUrl(imageUrl);
    setPhotoUploadMessage(null);
    try {
      const remaining = trailImages.filter((current) => current !== imageUrl);
      await updateTrailMutation.mutateAsync({
        image_url: remaining[0] || null,
        trail_images: remaining,
      });
      setPhotoUploadMessage('Trail image removed.');
    } catch (error) {
      setPhotoUploadMessage(
        error instanceof Error ? error.message : 'Failed to remove trail image'
      );
    } finally {
      setDeletingTrailImageUrl(null);
    }
  };

  const handleSetCoverImage = async (imageUrl: string) => {
    if (!canManageTrail || !trail) return;
    if (trail.image_url === imageUrl) return;
    setSettingCoverImageUrl(imageUrl);
    setPhotoUploadMessage(null);
    try {
      const merged = [imageUrl, ...trailImages].filter(Boolean);
      const unique = merged.filter((current, index, arr) => arr.indexOf(current) === index);
      await updateTrailMutation.mutateAsync({
        image_url: imageUrl,
        trail_images: unique,
      });
      setPhotoUploadMessage('Cover image updated from gallery.');
    } catch (error) {
      setPhotoUploadMessage(
        error instanceof Error ? error.message : 'Failed to set cover image'
      );
    } finally {
      setSettingCoverImageUrl(null);
    }
  };

  const applyTrailCoverImage = async (nextImageUrl: string) => {
    if (!trail || !nextImageUrl.trim()) return;
    const cleaned = nextImageUrl.trim();
    const merged = [cleaned, ...trailImages].filter(Boolean);
    const unique = merged.filter((image, index, arr) => arr.indexOf(image) === index);
    await updateTrailMutation.mutateAsync({
      image_url: cleaned,
      trail_images: unique,
    });
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageTrail) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCoverMessage('Please choose a valid image file.');
      return;
    }
    setCoverUploadBusy(true);
    setCoverMessage(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 1400, quality: 0.86 });
      await applyTrailCoverImage(dataUrl);
      setCoverMessage('Cover image updated.');
    } catch (err) {
      setCoverMessage(err instanceof Error ? err.message : 'Failed to upload cover image.');
    } finally {
      setCoverUploadBusy(false);
      if (event.target) event.target.value = '';
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

  const handleOpenRequestRide = () => {
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
    if (hasRequestedTrail) {
      setRequestMessage('You have already requested this trail.');
      return;
    }
    setRequestMessage(null);
    setRequestModalOpen(true);
  };

  const handleOpenReviewModal = () => {
    if (loadingCurrentUser) {
      setReviewMessage('Checking your account. Please try again in a second.');
      return;
    }
    if (!currentUser) {
      const next =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : `/trails/${trail.id}`;
      window.dispatchEvent(
        new CustomEvent('open-login', {
          detail: {
            message: 'Login to review this trail.',
            next,
          },
        })
      );
      return;
    }
    if (!canReviewTrail) {
      setReviewMessage('You can review this trail only after joining a ride.');
      setReviewModalOpen(true);
      return;
    }
    setReviewMessage(null);
    setReviewModalOpen(true);
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
  const reviewSummary = reviewData?.summary || { averageRating: 0, count: 0 };
  const trailConsiderations = [
    trail.is_hazardous
      ? `Hazard alert: ${trail.hazard_note || 'check latest conditions before riding.'}`
      : 'No active hazard alert, but ride with normal caution.',
    ...(trail.safety_labels || []).slice(0, 3).map((label) => getSafetyLabelText(label)),
    trail.difficulty === 'hard'
      ? 'Hard rating: expect demanding sections and sustained effort.'
      : trail.difficulty === 'medium'
        ? 'Medium rating: suitable for riders with regular off-road experience.'
        : 'Easy rating: suitable for most beginners with basic fitness.',
  ];

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={`star-${index}`} className="text-sm">
          {index < Math.round(rating) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );

  const trailActionItems: ThemedDropdownItem[] = [
    {
      label: 'Share trail',
      onSelect: copyTrailLink,
    },
    {
      label: !currentUser
        ? 'Write Review (Login)'
        : !canReviewTrail
          ? 'Write Review (Join First)'
          : existingReview
            ? 'Update Review'
            : 'Write Review',
      onSelect: handleOpenReviewModal,
    },
    {
      label: 'View map',
      href: '#trail-map',
      separatorBefore: true,
    },
    ...(komootNavigateUrl
      ? [
          {
            label: 'Navigate in Komoot',
            href: komootNavigateUrl,
          } as ThemedDropdownItem,
        ]
      : []),
    {
      label: 'Route guide',
      href: '#route-guide',
    },
    ...(canRequestTrail && !hasRequestedTrail
      ? [
          {
            label: 'Want to ride with a local pro?',
            onSelect: handleOpenRequestRide,
          } as ThemedDropdownItem,
        ]
      : []),
    ...(canRequestTrail && hasRequestedTrail
      ? [
          {
            label: hasCreatedEventForRequestedTrail
              ? 'Trail Requested (Event Created)'
              : 'Trail Requested',
            disabled: true,
          } as ThemedDropdownItem,
          {
            label: cancelRequestMutation.isPending
              ? 'Cancelling...'
              : hasCreatedEventForRequestedTrail
                ? 'Event Created'
                : 'Cancel Request',
            onSelect: async () => {
              if (hasCreatedEventForRequestedTrail) return;
              if (!existingTrailRequest?.id) return;
              try {
                await cancelRequestMutation.mutateAsync(existingTrailRequest.id);
              } catch (error) {
                setRequestMessage(
                  error instanceof Error ? error.message : 'Failed to cancel request'
                );
              }
            },
            disabled: cancelRequestMutation.isPending || hasCreatedEventForRequestedTrail,
          } as ThemedDropdownItem,
        ]
      : []),
    ...(trailImages.length > 0
      ? [
          {
            label: 'View Trail Photos',
            onSelect: () => {
              setGalleryInitialIndex(0);
              setGalleryModalOpen(true);
            },
            separatorBefore: true,
          } as ThemedDropdownItem,
        ]
      : []),
    ...(!isAdmin && canFlagHazard
      ? [
          {
            label: 'Manage Hazard',
            onSelect: () => setHazardModalOpen(true),
          } as ThemedDropdownItem,
        ]
      : []),
    ...(canManageTrail
      ? [
          {
            label: 'Change Cover',
            onSelect: () => setCoverModalOpen(true),
          } as ThemedDropdownItem,
        ]
      : []),
    ...(isAdmin
      ? [
          {
            label: uploading ? 'Uploading route...' : 'Upload GPX Route',
            onSelect: () => fileInputRef.current?.click(),
            separatorBefore: true,
          } as ThemedDropdownItem,
          ...(hasRoute
            ? [
                {
                  label: removeRouteMutation.isPending ? 'Removing...' : 'Remove GPX Route',
                  onSelect: async () => {
                    const confirmed = window.confirm('Remove the GPX route for this trail?');
                    if (!confirmed) return;
                    await removeRouteMutation.mutateAsync();
                  },
                  disabled: removeRouteMutation.isPending,
                } as ThemedDropdownItem,
              ]
            : []),
          {
            label: 'Manage Sport & Safety',
            onSelect: () => setSportSafetyModalOpen(true),
          } as ThemedDropdownItem,
          {
            label: 'Manage Hazard Status',
            onSelect: () => setHazardModalOpen(true),
          } as ThemedDropdownItem,
          {
            label: 'Edit Trail',
            onSelect: () => router.push(`/upload?trailId=${trailId}`),
          } as ThemedDropdownItem,
          {
            label:
              deleteTrailMutation.isPending || hideTrailMutation.isPending
                ? 'Deleting...'
                : 'Delete Trail',
            onSelect: handleDeleteTrail,
            disabled: deleteTrailMutation.isPending || hideTrailMutation.isPending,
            separatorBefore: true,
            tone: 'danger',
          } as ThemedDropdownItem,
        ]
      : []),
    ...(canUploadPhotos
      ? [
          {
            label: photoUploading ? 'Uploading photos...' : 'Upload Trail Photos',
            onSelect: () => photoInputRef.current?.click(),
            separatorBefore: !isAdmin,
          } as ThemedDropdownItem,
        ]
      : []),
    ...(canCreateEvent
      ? [
          {
            label: 'Create Event',
            onSelect: () => setCreateEventOpen(true),
          } as ThemedDropdownItem,
        ]
      : []),
  ];

  return (
    <div className="container mx-auto px-3 py-5 pb-24 sm:px-4 sm:py-8 sm:pb-8">
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBackToTrails}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Back to trails"
            title="Back to trails"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M12.9 15.3a1 1 0 0 0 0-1.4L9 10l3.9-3.9a1 1 0 1 0-1.4-1.4l-4.6 4.6a1 1 0 0 0 0 1.4l4.6 4.6a1 1 0 0 0 1.4 0Z" />
            </svg>
          </button>
          <ThemedDropdown
            label="Actions"
            hideCaret
            triggerContent={
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="h-5 w-5 fill-slate-800 dark:fill-slate-200"
              >
                <circle cx="10" cy="4" r="1.6" />
                <circle cx="10" cy="10" r="1.6" />
                <circle cx="10" cy="16" r="1.6" />
              </svg>
            }
            triggerClassName="h-10 w-10 justify-center rounded-full border border-gray-300 bg-white px-0 py-0 text-xl font-bold text-slate-800 hover:bg-slate-100/70 focus-visible:ring-green-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60"
            items={trailActionItems}
          />
        </div>
      </div>
      {(uploadSuccess || uploadError || photoUploadMessage || actionMessage) && (
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          {uploadSuccess && <span className="text-green-600">Route uploaded successfully.</span>}
          {uploadError && <span className="text-red-600">{uploadError}</span>}
          {photoUploadMessage && <span className="text-gray-600">{photoUploadMessage}</span>}
          {actionMessage && <span className="text-gray-600">{actionMessage}</span>}
        </div>
      )}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          onChange={handleFileUpload}
          className="hidden"
        />
      )}
      {canUploadPhotos && (
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          className="hidden"
        />
      )}

      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-lg shadow-emerald-100/60 dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 dark:shadow-emerald-950/30">
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
              {trail.sport_type && (
                <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900 dark:bg-slate-900/60 dark:text-emerald-200">
                  {getSportLabel(trail.sport_type)}
                </span>
              )}
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
              {hasRequestedTrail && (
                <span className="inline-flex items-center rounded-full border border-green-700 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
                  Trail Requested
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

        </div>
      </section>

      {!isAdmin && canManageTrail && (
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

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(routeData?.totalDistance || trail.distance_km) && (
          <div className="flex min-h-[106px] items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-gray-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[126px] sm:px-6 sm:py-5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                <path
                  d="M4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm8-6a6 6 0 0 0 0 12h.5v-6.2l3.6-2.4-.9-1.4-3.2 2.1H12V6Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Distance
              </p>
              <p className="text-lg font-semibold">
                {routeData?.totalDistance
                  ? `${routeData.totalDistance.toFixed(2)} km`
                  : `${trail.distance_km} km`}
              </p>
            </div>
          </div>
        )}
        {(routeData?.elevationGain || trail.elevation_gain_m) && (
          <div className="flex min-h-[106px] items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-gray-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[126px] sm:px-6 sm:py-5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                <path
                  d="M3 18h18l-6-10-4 6-3-4-5 8Zm9-8 2 3h-4l2-3Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Climb
              </p>
              <p className="text-lg font-semibold">
                {routeData?.elevationGain
                  ? `+${routeData.elevationGain.toFixed(0)} m`
                  : `${trail.elevation_gain_m} m`}
              </p>
            </div>
          </div>
        )}
        {trail.estimated_time_hours && (
          <div className="flex min-h-[106px] items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-gray-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[126px] sm:px-6 sm:py-5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                <path
                  d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm1 5h-2v6l4.5 2.7 1-1.6-3.5-2.1V7Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Time
              </p>
              <p className="text-lg font-semibold">~{trail.estimated_time_hours} hrs</p>
            </div>
          </div>
        )}
        {trail.difficulty && (
          <div className="flex min-h-[106px] items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-gray-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[126px] sm:px-6 sm:py-5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                <path
                  d="M4 19h16l-6-10-4 6-3-4-3 8Zm9-7 2 3h-4l2-3Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Level
              </p>
              <p className="text-lg font-semibold">{trail.difficulty}</p>
            </div>
          </div>
        )}
      </section>

      <section
        id="route-guide"
        className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-7 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Route guide
            </p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
              What to expect on this trail
            </h2>
            <p className="mt-3 text-[15px] leading-8 tracking-[0.01em] text-gray-700 dark:text-slate-200">
              {trail.description?.trim() || 'Route description will be added soon.'}
            </p>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Considerations
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-amber-900/90 dark:text-amber-100/90">
                {trailConsiderations.slice(0, 4).map((item, index) => (
                  <li key={`trail-consideration-${index}`} className="flex gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <div id="trail-map" className="mt-6">
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
          mapboxToken={mapboxToken}
          onStyleModeChange={setMapStyleMode}
          komootEmbedUrl={trail.komoot_embed_url || null}
        />
      </div>

      {(loadingReviews || Boolean(reviewData?.reviews?.length)) && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
          <div className="mt-4 space-y-3">
            {loadingReviews ? (
              <p className="text-sm text-gray-500 dark:text-slate-300">Loading reviews...</p>
            ) : (
              reviewData?.reviews?.map((review) => (
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
                            {(review.reviewer_name || 'R').slice(0, 1).toUpperCase()}
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
                    <p className="mt-3 text-sm text-gray-700 dark:text-slate-200">{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {trailImages.length > 0 && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trail Photos</h2>
            <button
              type="button"
              onClick={() => {
                setGalleryInitialIndex(0);
                setGalleryModalOpen(true);
              }}
              className="text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            >
              Open Gallery
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {trailImages.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className="relative h-32 overflow-hidden rounded-lg ring-offset-2 transition hover:scale-[1.01] hover:ring-2 hover:ring-green-400 dark:ring-offset-slate-900"
              >
                <button
                  type="button"
                  onClick={() => {
                    setGalleryInitialIndex(index);
                    setGalleryModalOpen(true);
                  }}
                  className="absolute inset-0"
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
                {canManageTrail && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteTrailImage(imageUrl)}
                    disabled={deletingTrailImageUrl === imageUrl || updateTrailMutation.isPending}
                    className="absolute right-2 top-2 z-10 rounded-full border border-white/70 bg-black/60 px-2 py-1 text-[11px] font-semibold text-white hover:bg-black/75 disabled:opacity-60"
                  >
                    {deletingTrailImageUrl === imageUrl ? 'Removing...' : 'Delete'}
                  </button>
                )}
                {canManageTrail &&
                  (trail?.image_url === imageUrl ? (
                    <span className="absolute bottom-2 left-2 z-10 rounded-full border border-emerald-200/70 bg-emerald-600/90 px-2 py-1 text-[11px] font-semibold text-white">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleSetCoverImage(imageUrl)}
                      disabled={settingCoverImageUrl === imageUrl || updateTrailMutation.isPending}
                      className="absolute bottom-2 right-2 z-10 rounded-full border border-white/70 bg-black/60 px-2 py-1 text-[11px] font-semibold text-white hover:bg-black/75 disabled:opacity-60"
                    >
                      {settingCoverImageUrl === imageUrl ? 'Setting...' : 'Set Cover'}
                    </button>
                  ))}
              </div>
            ))}
          </div>
          {photoUploadMessage && (
            <p className="mt-3 text-sm text-gray-700 dark:text-slate-200">{photoUploadMessage}</p>
          )}
        </div>
      )}

      <Dialog.Root
        open={requestModalOpen}
        onOpenChange={(open) => {
          setRequestModalOpen(open);
          if (!open) {
            setPreferredTime('');
            setOfferedPriceNpr('');
            setNearestPoint('');
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Request Trail Activity
            </Dialog.Title>
            <p className="mt-1 text-sm text-gray-600">
              {EXPERTS_BETA_ENABLED
                ? 'This sends your request to admin while experts are in beta. Add details to help planning.'
                : 'This sends your request to experts/admin. Add details to help them.'}
            </p>
            {requestMessage && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {requestMessage}
              </div>
            )}
            {!EXPERTS_BETA_ENABLED && (
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
            )}
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
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred Time
                </label>
                <input
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Offered Price (NPR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={offeredPriceNpr}
                  onChange={(e) => setOfferedPriceNpr(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nearest Point
              </label>
              <input
                type="text"
                value={nearestPoint}
                onChange={(e) => setNearestPoint(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Chobhar gate, near bus stop"
              />
            </div>
            <textarea
              value={requestDescription}
              onChange={(e) => setRequestDescription(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Share key expectations: fitness level, pace, route preferences, safety needs, and any special requests."
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
                  if (!EXPERTS_BETA_ENABLED && !selectedExpertId) {
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

      {canManageTrail && (
        <Dialog.Root open={coverModalOpen} onOpenChange={setCoverModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Change Cover Image
              </Dialog.Title>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Upload your own cover image for this trail.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                    Upload cover image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  {coverUploadBusy && (
                    <p className="mt-1 text-xs text-green-700 dark:text-green-300">Processing image...</p>
                  )}
                </div>
                {trail?.image_url && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-950/50">
                    <div className="relative h-36 overflow-hidden rounded-md">
                      <Image
                        src={trail.image_url}
                        alt={`${trail.name} cover preview`}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 92vw, 460px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
                {coverMessage && (
                  <p className="text-sm text-gray-700 dark:text-slate-200">{coverMessage}</p>
                )}
              </div>
              <div className="mt-5 flex justify-end">
                <Dialog.Close className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Close
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <AppDialog
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        title={existingReview ? 'Update Your Review' : 'Review This Trail'}
        description="Share your experience to help other riders."
      >
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setReviewMessage(null);
                if (!canReviewTrail) {
                  setReviewMessage('You can review this trail only after joining a ride.');
                  return;
                }
                if (!reviewAcceptTerms) {
                  setReviewMessage('Please accept the terms before submitting your review.');
                  return;
                }
                await reviewMutation.mutateAsync({
                  rating: reviewRating,
                  comment: reviewComment,
                });
              }}
              className="mt-4 grid gap-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Rating
                </label>
                <select
                  value={reviewRating}
                  onChange={(event) => setReviewRating(Number(event.target.value))}
                  disabled={!canReviewTrail}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                rows={4}
                disabled={!canReviewTrail}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Share what riders should expect on this trail."
              />
              <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={reviewAcceptTerms}
                  onChange={(event) => setReviewAcceptTerms(event.target.checked)}
                  disabled={!canReviewTrail}
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
                disabled={reviewMutation.isPending || !reviewAcceptTerms || !canReviewTrail}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reviewMutation.isPending ? 'Saving...' : existingReview ? 'Update Review' : 'Submit Review'}
                </button>
              </form>
      </AppDialog>

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

      {isAdmin && (
        <Dialog.Root open={sportSafetyModalOpen} onOpenChange={setSportSafetyModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Manage Sport & Safety
              </Dialog.Title>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Update trail sport type and safety labels.
              </p>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Sport Type
                </label>
                <select
                  value={(sportTypeDraft || 'mtb') as string}
                  onChange={(e) => setSportTypeDraft(e.target.value as Trail['sport_type'])}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {TRAIL_SPORTS.map((sport) => (
                    <option key={sport.value} value={sport.value}>
                      {sport.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Safety Labels
                </label>
                <div className="flex flex-wrap gap-2">
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
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  disabled={updateTrailMutation.isPending}
                  onClick={async () => {
                    try {
                      await updateTrailMutation.mutateAsync({
                        sport_type: sportTypeDraft || 'mtb',
                        safety_labels: safetyDraft,
                      });
                      setAdminMessage('Sport type and safety labels updated.');
                      setSportSafetyModalOpen(false);
                    } catch (err) {
                      setAdminMessage(
                        err instanceof Error ? err.message : 'Failed to update sport and safety.'
                      );
                    }
                  }}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                >
                  {updateTrailMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {canFlagHazard && (
        <AppDialog
          open={hazardModalOpen}
          onOpenChange={setHazardModalOpen}
          title="Manage Hazard Status"
          description="Mark this trail hazardous when conditions are unsafe."
          maxWidthClassName="max-w-xl"
        >
          <div className="mt-4">
            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={hazardousDraft}
                onChange={(event) => setHazardousDraft(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Flag this trail as hazardous</span>
            </label>
            <textarea
              value={hazardNoteDraft}
              onChange={(event) => setHazardNoteDraft(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Optional: brief hazard details (landslide, damaged bridge, heavy traffic)."
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setHazardousDraft(Boolean(trail.is_hazardous));
                  setHazardNoteDraft(trail.hazard_note || '');
                  setAdminMessage('Hazard status reset.');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={updateTrailMutation.isPending}
                onClick={async () => {
                  try {
                    await updateTrailMutation.mutateAsync({
                      is_hazardous: hazardousDraft,
                      hazard_note: hazardNoteDraft.trim() || null,
                    });
                    setAdminMessage('Hazard status updated.');
                    setHazardModalOpen(false);
                  } catch (err) {
                    setAdminMessage(
                      err instanceof Error ? err.message : 'Failed to update hazard status.'
                    );
                  }
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {updateTrailMutation.isPending ? 'Saving...' : 'Save Hazard Status'}
              </button>
            </div>
          </div>
        </AppDialog>
      )}

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

      <TrailImageCarouselModal
        open={galleryModalOpen}
        onOpenChange={setGalleryModalOpen}
        trailName={trail.name}
        images={trailImages}
        initialIndex={galleryInitialIndex}
      />

    </div>
  );
};

export default TrailPageClient;
