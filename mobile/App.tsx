import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking as NativeLinking,
  Pressable,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  OfflineManager,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import { fetchNavigationTrail } from './src/api';
import { metersBetween, nearestRoutePoint, routeBounds, routeDistances } from './src/geo';
import { parseGpx } from './src/gpx';
import { cacheTrail, readCachedTrail } from './src/storage';
import type { NavigationTrail, RoutePoint } from './src/types';

const MAP_STYLE =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
const OFF_ROUTE_THRESHOLD_M = 60;
const LOCATION_TOO_FAR_FROM_ROUTE_M = 100_000;

function trailIdentifierFromUrl(url: string | null) {
  if (!url) return '';
  const parsed = Linking.parse(url);
  const path = String(parsed.path || '').replace(/^\/+|\/+$/g, '');
  const parts = path.split('/').filter(Boolean);
  const decodeIdentifier = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  if (String(parsed.hostname || '').toLowerCase() === 'navigate' && path) {
    return decodeIdentifier(path);
  }
  if (parts[0] === 'navigate' || parts[0] === 'trails') {
    return decodeIdentifier(parts.slice(1).join('/'));
  }
  return '';
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function isValidRoutePoint(point: RoutePoint) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function pointFromLocation(location: Location.LocationObject): RoutePoint {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export default function App() {
  useKeepAwake();
  const [identifier, setIdentifier] = useState('');
  const [trail, setTrail] = useState<NavigationTrail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offlineStatus, setOfflineStatus] = useState('Not downloaded');
  const [navigating, setNavigating] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [offRouteM, setOffRouteM] = useState(0);
  const [remainingM, setRemainingM] = useState(0);
  const [nearestIndex, setNearestIndex] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<RoutePoint | null>(null);
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [followingUser, setFollowingUser] = useState(false);
  const [rerouteGuideEnabled, setRerouteGuideEnabled] = useState(false);
  const [mapError, setMapError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastLocation = useRef<RoutePoint | null>(null);
  const followingUserRef = useRef(false);
  const badLocationWarningShown = useRef(false);

  const loadTrail = useCallback(async (nextIdentifier: string) => {
    if (!nextIdentifier) return;
    setIdentifier(nextIdentifier);
    setLoading(true);
    setError('');
    setMapError('');
    setMapLoaded(false);
    const cached = await readCachedTrail(nextIdentifier);
    if (cached) setTrail(cached);
    else setTrail(null);
    try {
      const fresh = await fetchNavigationTrail(nextIdentifier);
      if ((fresh.route_data?.coordinates || []).filter(isValidRoutePoint).length < 2) {
        throw new Error('This trail does not have a navigation route yet.');
      }
      setTrail(fresh);
      await cacheTrail(nextIdentifier, fresh);
    } catch (requestError) {
      if (!cached) {
        setError(requestError instanceof Error ? requestError.message : 'Could not load trail.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const importGpx = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/gpx+xml', 'application/xml', 'text/xml', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const xml = await (await fetch(asset.uri)).text();
      const fallbackName = asset.name.replace(/\.gpx$/i, '') || 'Imported GPX route';
      const importedTrail = parseGpx(xml, fallbackName);
      setIdentifier(importedTrail.id);
      setTrail(importedTrail);
      setOfflineStatus('Route imported · map not downloaded');
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Could not import this GPX file.');
    }
  };

  useEffect(() => {
    Linking.getInitialURL().then((url) => loadTrail(trailIdentifierFromUrl(url)));
    const subscription = Linking.addEventListener('url', ({ url }) => {
      loadTrail(trailIdentifierFromUrl(url));
    });
    return () => subscription.remove();
  }, [loadTrail]);

  const route = useMemo(
    () => (trail?.route_data?.coordinates || []).filter(isValidRoutePoint),
    [trail]
  );
  const bounds = useMemo(() => (route.length >= 2 ? routeBounds(route) : null), [route]);
  const routeMetrics = useMemo(() => routeDistances(route), [route]);
  const routeShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: route.map((point) => [point.longitude, point.latitude]),
      },
    }),
    [route]
  );
  const completedRouteShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: route
          .slice(0, Math.max(2, nearestIndex + 1))
          .map((point) => [point.longitude, point.latitude]),
      },
    }),
    [nearestIndex, route]
  );
  const routeEndpointsShape = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: route.length
        ? [
            {
              type: 'Feature' as const,
              properties: { kind: 'start' },
              geometry: {
                type: 'Point' as const,
                coordinates: [route[0].longitude, route[0].latitude],
              },
            },
            {
              type: 'Feature' as const,
              properties: { kind: 'finish' },
              geometry: {
                type: 'Point' as const,
                coordinates: [route.at(-1)!.longitude, route.at(-1)!.latitude],
              },
            },
          ]
        : [],
    }),
    [route]
  );
  const nextPoint = route[Math.min(route.length - 1, nearestIndex + 8)] || route.at(-1) || null;
  const nextDistanceM = currentLocation && nextPoint ? metersBetween(currentLocation, nextPoint) : null;
  const nearestRoute = useMemo(
    () => (currentLocation ? nearestRoutePoint(currentLocation, route) : null),
    [currentLocation, route]
  );
  const shouldShowRerouteGuide =
    rerouteGuideEnabled &&
    navigating &&
    currentLocation &&
    nearestRoute &&
    offRouteM > OFF_ROUTE_THRESHOLD_M;
  const rerouteGuideShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates:
          shouldShowRerouteGuide && currentLocation && nearestRoute
            ? [
                [currentLocation.longitude, currentLocation.latitude],
                [nearestRoute.point.longitude, nearestRoute.point.latitude],
              ]
            : [],
      },
    }),
    [currentLocation, nearestRoute, shouldShowRerouteGuide]
  );
  const routePadding = useMemo(
    () =>
      navigating
        ? { top: 118, right: 48, bottom: 238, left: 48 }
        : { top: 118, right: 48, bottom: 224, left: 48 },
    [navigating]
  );

  const fitRoute = useCallback(
    (duration = 600) => {
      if (!bounds) return;
      cameraRef.current?.fitBounds(bounds, {
        padding: routePadding,
        duration,
      });
    },
    [bounds, routePadding]
  );

  const locationDistanceFromRoute = useCallback(
    (point: RoutePoint) => nearestRoutePoint(point, route).distanceM,
    [route]
  );

  const isLocationUsableForRoute = useCallback(
    (point: RoutePoint) => {
      const routeDistanceM = locationDistanceFromRoute(point);
      return routeDistanceM <= LOCATION_TOO_FAR_FROM_ROUTE_M;
    },
    [locationDistanceFromRoute]
  );

  const downloadOfflineMap = async () => {
    if (!trail || !bounds) return;
    setOfflineStatus('Starting download…');
    try {
      const existing = await OfflineManager.getPacks();
      const oldPack = existing.find((pack) => pack.metadata?.trailId === trail.id);
      if (oldPack) {
        setOfflineStatus('Available offline');
        return;
      }
      await OfflineManager.createPack(
        {
          mapStyle: MAP_STYLE,
          minZoom: 10,
          maxZoom: 17,
          bounds,
          metadata: { trailId: trail.id, trailName: trail.name },
        },
        (_pack, status) => {
          const percentage = Math.round(status.percentage || 0);
          setOfflineStatus(percentage >= 100 ? 'Available offline' : `Downloading ${percentage}%`);
        },
        (_pack, downloadError) => setOfflineStatus(`Download failed: ${downloadError.message}`)
      );
    } catch (downloadError) {
      setOfflineStatus(
        downloadError instanceof Error ? downloadError.message : 'Offline download failed.'
      );
    }
  };

  const setFollowMode = (enabled: boolean) => {
    followingUserRef.current = enabled;
    setFollowingUser(enabled);
  };

  const appendPoint = (location: Location.LocationObject) => {
    const current = pointFromLocation(location);
    if (!isLocationUsableForRoute(current)) {
      setFollowMode(false);
      setRerouteGuideEnabled(false);
      fitRoute(600);
      if (!badLocationWarningShown.current) {
        badLocationWarningShown.current = true;
        Alert.alert(
          'GPS jumped away from the trail',
          `Android reported a location ${formatDistance(locationDistanceFromRoute(current))} from the route, so navigation stopped following it.`
        );
      }
      return;
    }
    badLocationWarningShown.current = false;
    setCurrentLocation(current);
    setSpeedMps(location.coords.speed != null && location.coords.speed >= 0 ? location.coords.speed : null);
    setAccuracyM(location.coords.accuracy);
    if (lastLocation.current) {
      const delta = metersBetween(lastLocation.current, current);
      if (delta < 250 && (location.coords.accuracy == null || location.coords.accuracy <= 80)) {
        setDistanceM((value) => value + delta);
      }
    }
    lastLocation.current = current;
    const nearest = nearestRoutePoint(current, route);
    setNearestIndex(nearest.index);
    setOffRouteM(nearest.distanceM);
    setRemainingM(Math.max(0, routeMetrics.totalM - nearest.alongM));
    if (nearest.distanceM <= OFF_ROUTE_THRESHOLD_M) {
      setRerouteGuideEnabled(false);
    }

    if (followingUserRef.current) {
      const heading = location.coords.heading;
      cameraRef.current?.easeTo({
        center: [current.longitude, current.latitude],
        zoom: 16.5,
        pitch: 48,
        ...(heading != null && heading >= 0 ? { bearing: heading } : {}),
        duration: 700,
      });
    }
  };

  const requestLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      Alert.alert('Location required', 'Allow precise location to navigate this trail.');
      return null;
    }
    return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  };

  const focusCurrentLocation = async () => {
    const location = await requestLocation();
    const point = location ? pointFromLocation(location) : currentLocation;
    if (!point) return;
    if (!isLocationUsableForRoute(point)) {
      setFollowMode(false);
      fitRoute(600);
      Alert.alert(
        'Location looks wrong',
        `Android reported a location ${formatDistance(locationDistanceFromRoute(point))} from this trail. I kept the map on the route. On an emulator, set the mock GPS location near the trail in Extended controls.`
      );
      return;
    }
    if (location) {
      setCurrentLocation(point);
      setAccuracyM(location.coords.accuracy);
    }
    if (navigating) setFollowMode(true);
    cameraRef.current?.easeTo({
      center: [point.longitude, point.latitude],
      zoom: navigating ? 16.5 : 15.5,
      pitch: navigating ? 48 : 0,
      duration: 600,
    });
  };

  const showEntireRoute = () => {
    setFollowMode(false);
    setRerouteGuideEnabled(false);
    setTimeout(() => fitRoute(600), 80);
  };

  const guideBackToRoute = () => {
    if (!currentLocation || !nearestRoute) return;
    setFollowMode(false);
    setRerouteGuideEnabled(true);
    cameraRef.current?.fitBounds(
      [
        Math.min(currentLocation.longitude, nearestRoute.point.longitude) - 0.003,
        Math.min(currentLocation.latitude, nearestRoute.point.latitude) - 0.003,
        Math.max(currentLocation.longitude, nearestRoute.point.longitude) + 0.003,
        Math.max(currentLocation.latitude, nearestRoute.point.latitude) + 0.003,
      ],
      { padding: routePadding, duration: 600 }
    );
  };

  const startNavigation = async () => {
    if (!trail) return;
    const initialLocation = await requestLocation();
    if (!initialLocation) return;
    const initialPoint = pointFromLocation(initialLocation);
    if (!isLocationUsableForRoute(initialPoint)) {
      setFollowMode(false);
      fitRoute(600);
      Alert.alert(
        'Location is far from this trail',
        `Android reported a location ${formatDistance(locationDistanceFromRoute(initialPoint))} from the route. Move closer to the trail or set the emulator GPS near the route before starting navigation.`
      );
      return;
    }
    lastLocation.current = null;
    setDistanceM(0);
    setRemainingM(routeMetrics.totalM);
    setNearestIndex(0);
    setRerouteGuideEnabled(false);
    badLocationWarningShown.current = false;
    setCurrentLocation(initialPoint);
    setNavigating(true);
    setFollowMode(true);
    appendPoint(initialLocation);
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 3,
        timeInterval: 2000,
      },
      appendPoint
    );
  };

  const stopNavigation = () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setNavigating(false);
    setFollowMode(false);
    setRerouteGuideEnabled(false);
    showEntireRoute();
  };

  useEffect(() => {
    if (!bounds || !mapLoaded) return;
    const timeout = setTimeout(() => {
      fitRoute(0);
    }, 150);
    return () => clearTimeout(timeout);
  }, [bounds, fitRoute, mapLoaded, trail?.id]);

  useEffect(() => () => locationSubscription.current?.remove(), []);

  if (!identifier) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.emptyScreen}>
          <StatusBar style="light" />
          <Text style={styles.brand}>LocoXperts Navigator</Text>
          <Text style={styles.emptyTitle}>Open a trail from LocoXperts</Text>
          <Text style={styles.muted}>
            No account is needed. Choose “Open in LocoXperts Navigator” on a trail page.
          </Text>
          <Pressable style={styles.importButton} onPress={importGpx}>
            <Text style={styles.importButtonText}>Upload a GPX file</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (loading && !trail) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.emptyScreen}>
          <ActivityIndicator color="#34d399" size="large" />
          <Text style={styles.muted}>Loading trail…</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!trail || !bounds) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.emptyScreen}>
          <Text style={styles.emptyTitle}>Trail unavailable</Text>
          <Text style={styles.error}>{error || 'No route is available for this trail.'}</Text>
          <Pressable style={styles.importButton} onPress={importGpx}>
            <Text style={styles.importButtonText}>Upload a GPX file instead</Text>
          </Pressable>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const [west, south, east, north] = bounds;
  const progressPercent = routeMetrics.totalM
    ? Math.max(0, Math.min(100, ((routeMetrics.totalM - remainingM) / routeMetrics.totalM) * 100))
    : 0;
  const navigationMessage = remainingM <= 40
    ? 'You are arriving at the trail finish'
    : offRouteM > OFF_ROUTE_THRESHOLD_M
      ? `Return to the route · ${formatDistance(offRouteM)} away`
      : nextDistanceM != null && nextDistanceM > 25
        ? `Stay on route · next check ${formatDistance(nextDistanceM)} ahead`
      : followingUser
        ? 'Following your position'
        : 'Map unlocked · tap recenter to follow';
  return (
    <SafeAreaProvider>
      <View style={styles.screen}>
      <NativeStatusBar translucent backgroundColor="transparent" />
      <StatusBar style="light" />
      <Map
        key={trail.id}
        style={styles.map}
        mapStyle={MAP_STYLE}
        androidView="texture"
        compass
        scaleBar
        attribution
        logo={false}
        preferredFramesPerSecond={navigating ? 60 : 30}
        compassPosition={{ top: 100, right: 16 }}
        attributionPosition={{ bottom: 8, left: 8 }}
        scaleBarPosition={{ top: 96, left: 16 }}
        onRegionWillChange={(event) => {
          if (navigating && event.nativeEvent.userInteraction) setFollowMode(false);
        }}
        onDidFailLoadingMap={() => setMapError('Map tiles could not be loaded. Your route is still available.')}
        onDidFinishLoadingMap={() => {
          setMapLoaded(true);
          setMapError('');
        }}
      >
        <Camera
          ref={cameraRef}
          trackUserLocation={followingUser ? 'course' : undefined}
          initialViewState={{
            bounds: [west, south, east, north],
            padding: routePadding,
          }}
        />
        <GeoJSONSource id="trail-route" data={routeShape}>
          <Layer
            id="trail-route-casing"
            type="line"
            paint={{ 'line-color': '#052e24', 'line-width': 9, 'line-opacity': 0.9 }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          <Layer
            id="trail-route-line"
            type="line"
            paint={{ 'line-color': '#2dd4bf', 'line-width': 5.5 }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>
        {navigating ? (
          <GeoJSONSource id="completed-route" data={completedRouteShape}>
            <Layer
              id="completed-route-line"
              type="line"
              paint={{ 'line-color': '#f8fafc', 'line-width': 3, 'line-opacity': 0.9 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        ) : null}
        {shouldShowRerouteGuide ? (
          <GeoJSONSource id="reroute-guide" data={rerouteGuideShape}>
            <Layer
              id="reroute-guide-casing"
              type="line"
              paint={{
                'line-color': '#111827',
                'line-width': 7,
                'line-opacity': 0.75,
                'line-dasharray': [0.8, 0.7],
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            <Layer
              id="reroute-guide-line"
              type="line"
              paint={{
                'line-color': '#fbbf24',
                'line-width': 4,
                'line-dasharray': [0.8, 0.7],
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        ) : null}
        <GeoJSONSource id="route-endpoints" data={routeEndpointsShape}>
          <Layer
            id="route-start"
            type="circle"
            filter={['==', ['get', 'kind'], 'start']}
            paint={{
              'circle-radius': 7,
              'circle-color': '#ffffff',
              'circle-stroke-color': '#059669',
              'circle-stroke-width': 4,
            }}
          />
          <Layer
            id="route-finish"
            type="circle"
            filter={['==', ['get', 'kind'], 'finish']}
            paint={{
              'circle-radius': 7,
              'circle-color': '#0f172a',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 4,
            }}
          />
        </GeoJSONSource>
        <UserLocation accuracy heading minDisplacement={2} />
      </Map>
      {!mapLoaded ? (
        <View pointerEvents="none" style={styles.mapLoading}>
          <ActivityIndicator color="#047857" />
          <Text style={styles.mapLoadingText}>Loading map</Text>
        </View>
      ) : null}

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topPanel}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text numberOfLines={1} style={styles.trailName}>{trail.name}</Text>
              <Text numberOfLines={1} style={styles.locationText}>{trail.location}</Text>
            </View>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{trail.source === 'gpx' ? 'GPX' : trail.difficulty}</Text>
            </View>
          </View>
          {mapError ? <Text style={styles.mapError}>{mapError}</Text> : null}
        </View>

        <View style={styles.lowerOverlay} pointerEvents="box-none">
          <View style={styles.mapControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={navigating ? 'Recenter and follow my location' : 'Jump to my location'}
              style={[styles.mapControl, followingUser && styles.mapControlActive]}
              onPress={focusCurrentLocation}
            >
              <Text style={[styles.mapControlIcon, followingUser && styles.mapControlIconActive]}>
                {followingUser ? '⌖' : '◎'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show the entire route"
              style={styles.mapControl}
              onPress={showEntireRoute}
            >
              <Text style={styles.mapControlIcon}>⌗</Text>
            </Pressable>
          </View>

          <View style={styles.navPanel}>
            {navigating ? (
              <>
                <View style={[styles.guidanceCard, offRouteM > OFF_ROUTE_THRESHOLD_M && styles.guidanceWarning]}>
                  <Text style={styles.guidanceEyebrow}>
                    {remainingM <= 40 ? 'ARRIVING' : offRouteM > OFF_ROUTE_THRESHOLD_M ? 'OFF ROUTE' : 'NAVIGATING'}
                  </Text>
                  <Text style={styles.guidanceText}>{navigationMessage}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
                <View style={styles.metrics}>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>REMAINING</Text>
                    <Text style={styles.metricValue}>{formatDistance(remainingM)}</Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>SPEED</Text>
                    <Text style={styles.metricValue}>
                      {speedMps == null ? '—' : `${(speedMps * 3.6).toFixed(1)}`}
                      {speedMps == null ? '' : <Text style={styles.metricUnit}> km/h</Text>}
                    </Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>GPS</Text>
                    <Text style={[styles.metricValue, accuracyM != null && accuracyM > 30 && styles.warning]}>
                      {accuracyM == null ? '—' : `±${Math.round(accuracyM)} m`}
                    </Text>
                  </View>
                </View>
                <View style={styles.navigationFooter}>
                  <Text style={styles.travelledText}>{formatDistance(distanceM)} travelled</Text>
                  <View style={styles.navigationActions}>
                    {offRouteM > OFF_ROUTE_THRESHOLD_M ? (
                      <Pressable style={styles.guideButton} onPress={guideBackToRoute}>
                        <Text style={styles.guideButtonText}>Guide back</Text>
                      </Pressable>
                    ) : null}
                    <Pressable style={styles.stopButton} onPress={stopNavigation}>
                      <Text style={styles.stopButtonText}>End</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.metrics}>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>DISTANCE</Text>
                    <Text style={styles.metricValue}>{trail.distance_km || '—'} km</Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>CLIMB</Text>
                    <Text style={styles.metricValue}>{trail.elevation_gain_m || '—'} m</Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>OFFLINE</Text>
                    <Text style={styles.metricSmall}>{offlineStatus}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save map offline"
                    style={styles.iconButton}
                    onPress={downloadOfflineMap}
                  >
                    <Text style={styles.iconButtonText}>⇣</Text>
                  </Pressable>
                  <Pressable style={styles.button} onPress={startNavigation}>
                    <Text style={styles.buttonText}>Start navigation</Text>
                  </Pressable>
                </View>
                {trail.komoot_url ? (
                  <Pressable onPress={() => NativeLinking.openURL(trail.komoot_url!)}>
                    <Text style={styles.komootLink}>Open in Komoot</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#dce7df' },
  map: { flex: 1 },
  mapLoading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#e7efe8',
  },
  mapLoadingText: { color: '#16372a', fontSize: 13, fontWeight: '800' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  emptyScreen: {
    flex: 1,
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#071711',
  },
  brand: { color: '#5ee3ad', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  emptyTitle: { color: '#f8fafc', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  topPanel: {
    marginTop: (NativeStatusBar.currentHeight || 0) + 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    backgroundColor: 'rgba(7, 23, 17, 0.9)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 3 },
  trailName: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  locationText: { color: '#a8bdb2', fontSize: 12 },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#174d39',
  },
  difficultyText: { color: '#a7f3d0', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  mapError: { marginTop: 9, color: '#fecaca', fontSize: 12 },
  muted: { color: '#a7b5ae', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  error: { color: '#fca5a5', fontSize: 14, textAlign: 'center' },
  importButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: '#1f6c4d',
    borderRadius: 14,
    backgroundColor: '#102c21',
  },
  importButtonText: { color: '#6ee7b7', fontSize: 15, fontWeight: '800' },
  lowerOverlay: { gap: 9 },
  mapControls: { alignSelf: 'flex-end', gap: 9 },
  mapControl: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.15)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  mapControlActive: { borderColor: '#047857', backgroundColor: '#047857' },
  mapControlIcon: { color: '#16372a', fontSize: 27, fontWeight: '900', lineHeight: 30 },
  mapControlIconActive: { color: '#ffffff' },
  navPanel: {
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(7, 23, 17, 0.94)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  guidanceCard: { gap: 3, padding: 12, borderRadius: 12, backgroundColor: '#123b2d' },
  guidanceWarning: { backgroundColor: '#713f12' },
  guidanceEyebrow: { color: '#6ee7b7', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  guidanceText: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  progressTrack: { height: 5, overflow: 'hidden', borderRadius: 999, backgroundColor: '#29463a' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#2dd4bf' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  metricBlock: { flex: 1, gap: 2 },
  metricLabel: { color: '#81988c', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  metricValue: { color: '#f8fafc', fontSize: 19, fontWeight: '900' },
  metricUnit: { color: '#9fb0a7', fontSize: 10, fontWeight: '700' },
  metricSmall: { color: '#d8e5de', fontSize: 11, fontWeight: '700' },
  warning: { color: '#fbbf24' },
  actions: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 52,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2c6851',
    borderRadius: 14,
    backgroundColor: '#102c21',
  },
  iconButtonText: { color: '#a7f3d0', fontSize: 25, fontWeight: '900', lineHeight: 28 },
  button: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#047857',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2c6851',
    borderRadius: 15,
    backgroundColor: '#102c21',
  },
  secondaryButtonText: { color: '#a7f3d0', fontSize: 14, fontWeight: '800' },
  navigationFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  navigationActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  travelledText: { color: '#a8bdb2', fontSize: 12, fontWeight: '700' },
  guideButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: '#f59e0b',
  },
  guideButtonText: { color: '#111827', fontSize: 13, fontWeight: '900' },
  stopButton: {
    minWidth: 76,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#991b1b',
  },
  stopButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  komootLink: { color: '#9fb0a7', fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
