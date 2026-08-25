import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import type { CameraRef } from '@maplibre/maplibre-react-native';

import { NavigationHeader } from './src/components/NavigationHeader';
import { NavigationControls } from './src/components/NavigationControls';
import { NavigationHud } from './src/components/NavigationHud';
import { TrailMap } from './src/components/TrailMap';
import { routeBounds } from './src/geo';
import { isValidRoutePoint, useTrailLoader } from './src/hooks/useTrailLoader';
import { useOfflineMap } from './src/hooks/useOfflineMap';
import {
  formatDistance,
  OFF_ROUTE_THRESHOLD_M,
  useTrailNavigation,
} from './src/hooks/useTrailNavigation';

const MAP_STYLE =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

export default function App() {
  useKeepAwake();
  const cameraRef = useRef<CameraRef>(null);

  const {
    identifier,
    trail,
    loading,
    error,
    importGpx,
  } = useTrailLoader();

  const [mapError, setMapError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);

  const route = useMemo(
    () => (trail?.route_data?.coordinates || []).filter(isValidRoutePoint),
    [trail]
  );
  const bounds = useMemo(() => (route.length >= 2 ? routeBounds(route) : null), [route]);

  const {
    offlineStatus,
    downloadOfflineMap,
  } = useOfflineMap(trail, bounds, MAP_STYLE);

  const {
    navigating,
    distanceM,
    offRouteM,
    remainingM,
    nearestIndex,
    currentLocation,
    speedMps,
    accuracyM,
    followingUser,
    rerouteGuideEnabled,
    nearestRoute,
    routeMetrics,
    routePadding,
    startNavigation,
    stopNavigation,
    setFollowMode,
    focusCurrentLocation,
    showEntireRoute,
    guideBackToRoute,
    fitRoute,
  } = useTrailNavigation(route, cameraRef, bounds);

  // Auto-fit route bounds when map finishes loading or trail changes
  useEffect(() => {
    if (!bounds || !mapLoaded) return;
    const timeout = setTimeout(() => {
      fitRoute(0);
    }, 150);
    return () => clearTimeout(timeout);
  }, [bounds, fitRoute, mapLoaded, trail?.id]);

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

  const shouldShowRerouteGuide =
    rerouteGuideEnabled &&
    navigating &&
    currentLocation != null &&
    nearestRoute != null &&
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

  const progressPercent = routeMetrics.totalM
    ? Math.max(0, Math.min(100, ((routeMetrics.totalM - remainingM) / routeMetrics.totalM) * 100))
    : 0;

  const nextPoint = route[Math.min(route.length - 1, nearestIndex + 8)] || route.at(-1) || null;
  const navigationMessage =
    remainingM <= 40
      ? 'You are arriving at the trail finish'
      : offRouteM > OFF_ROUTE_THRESHOLD_M
        ? `Return to the route · ${formatDistance(offRouteM)} away`
        : followingUser
          ? 'Following your position'
          : 'Map unlocked · tap recenter to follow';

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

  return (
    <SafeAreaProvider>
      <View style={styles.screen}>
        <NativeStatusBar translucent backgroundColor="transparent" />
        <StatusBar style="light" />

        <TrailMap
          trailId={trail.id}
          mapStyleUrl={MAP_STYLE}
          cameraRef={cameraRef}
          bounds={bounds}
          routePadding={routePadding}
          followingUser={followingUser}
          navigating={navigating}
          mapLoaded={mapLoaded}
          routeShape={routeShape}
          completedRouteShape={completedRouteShape}
          shouldShowRerouteGuide={shouldShowRerouteGuide}
          rerouteGuideShape={rerouteGuideShape}
          routeEndpointsShape={routeEndpointsShape}
          onMapLoaded={() => {
            setMapLoaded(true);
            setMapError('');
          }}
          onMapError={setMapError}
          onRegionWillChange={(event) => {
            if (navigating && event.nativeEvent?.userInteraction) {
              setFollowMode(false);
            }
          }}
        />

        <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
          <NavigationHeader trail={trail} mapError={mapError} />

          <View style={styles.lowerOverlay} pointerEvents="box-none">
            <NavigationControls
              followingUser={followingUser}
              navigating={navigating}
              onFocusLocation={focusCurrentLocation}
              onShowEntireRoute={showEntireRoute}
            />

            <NavigationHud
              trail={trail}
              navigating={navigating}
              remainingM={remainingM}
              offRouteM={offRouteM}
              distanceM={distanceM}
              speedMps={speedMps}
              accuracyM={accuracyM}
              progressPercent={progressPercent}
              navigationMessage={navigationMessage}
              offlineStatus={offlineStatus}
              offRouteThresholdM={OFF_ROUTE_THRESHOLD_M}
              onStartNavigation={startNavigation}
              onStopNavigation={stopNavigation}
              onGuideBackToRoute={guideBackToRoute}
              onDownloadOfflineMap={downloadOfflineMap}
            />
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#dce7df' },
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
});
