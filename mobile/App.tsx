import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import type { CameraRef } from '@maplibre/maplibre-react-native';

import { ElevationProfilePanel } from './src/components/ElevationProfilePanel';
import { NavigationHeader } from './src/components/NavigationHeader';
import { NavigationControls } from './src/components/NavigationControls';
import { NavigationHud } from './src/components/NavigationHud';
import { TrailMap } from './src/components/TrailMap';
import {
  calculateElevationMetrics,
  generateRouteDirectionArrows,
  routeBounds,
} from './src/geo';
import { isValidRoutePoint, useTrailLoader } from './src/hooks/useTrailLoader';
import { useOfflineMap } from './src/hooks/useOfflineMap';
import {
  formatDistance,
  OFF_ROUTE_THRESHOLD_M,
  useTrailNavigation,
} from './src/hooks/useTrailNavigation';

const MAP_STYLES = [
  { name: 'Outdoor', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { name: 'Clean', url: 'https://tiles.openfreemap.org/styles/bright' },
  { name: 'Dark', url: 'https://tiles.openfreemap.org/styles/dark' },
];

export default function App() {
  useKeepAwake();
  const cameraRef = useRef<CameraRef>(null);

  const {
    identifier,
    trail,
    loading,
    error,
    recentTrails,
    loadTrail,
    importGpx,
    resetTrail,
  } = useTrailLoader();

  const [mapStyleIndex, setMapStyleIndex] = useState(0);
  const [mapError, setMapError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showElevation, setShowElevation] = useState(false);

  const currentMapStyle = MAP_STYLES[mapStyleIndex % MAP_STYLES.length];

  const route = useMemo(
    () => (trail?.route_data?.coordinates || []).filter(isValidRoutePoint),
    [trail]
  );
  const bounds = useMemo(() => (route.length >= 2 ? routeBounds(route) : null), [route]);
  const elevationMetrics = useMemo(() => calculateElevationMetrics(route), [route]);

  const {
    offlineStatus,
    downloadOfflineMap,
  } = useOfflineMap(trail, bounds, currentMapStyle.url);

  const {
    navigating,
    distanceM,
    offRouteM,
    remainingM,
    nearestIndex,
    currentLocation,
    speedMps,
    accuracyM,
    userHeading,
    followingUser,
    rerouteGuideEnabled,
    roadRerouteCoordinates,
    roadInstruction,
    nearestRoute,
    safestReroute,
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

  const handleReturnToMenu = useCallback(() => {
    if (navigating) {
      Alert.alert(
        'Exit Navigation',
        'Are you sure you want to end this ride and return to the main menu?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => {
              stopNavigation();
              resetTrail();
            },
          },
        ]
      );
    } else {
      resetTrail();
    }
  }, [navigating, resetTrail, stopNavigation]);

  const handleShareTrail = useCallback(async () => {
    if (!trail) return;
    try {
      const shareUrl = `https://www.locoxperts.com/trails/${trail.slug || trail.id}`;
      await Share.share({
        title: trail.name,
        message: `Check out ${trail.name} on LocoXperts: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // User dismissed share dialog
    }
  }, [trail]);

  const handleCycleMapStyle = useCallback(() => {
    setMapStyleIndex((prev) => (prev + 1) % MAP_STYLES.length);
  }, []);

  const handleResetNorth = useCallback(() => {
    if (currentLocation) {
      cameraRef.current?.easeTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        bearing: 0,
        pitch: 0,
        duration: 500,
      });
    } else if (bounds) {
      cameraRef.current?.easeTo({
        center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2],
        bearing: 0,
        pitch: 0,
        duration: 500,
      });
    }
  }, [bounds, currentLocation]);

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

  const routeDirectionArrowsShape = useMemo(() => {
    const arrows = generateRouteDirectionArrows(route, 25);
    return {
      type: 'FeatureCollection' as const,
      features: arrows.map((arrow, idx) => ({
        type: 'Feature' as const,
        id: idx,
        properties: { bearing: arrow.bearing },
        geometry: {
          type: 'Point' as const,
          coordinates: arrow.coordinate,
        },
      })),
    };
  }, [route]);

  const userLocationShape = useMemo(() => {
    if (!currentLocation) return null;
    return {
      type: 'Feature' as const,
      properties: {
        heading: userHeading,
        accuracyRadius: Math.min(35, Math.max(14, (accuracyM || 10) / 2)),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [currentLocation.longitude, currentLocation.latitude],
      },
    };
  }, [currentLocation, userHeading, accuracyM]);

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
    offRouteM > OFF_ROUTE_THRESHOLD_M;

  const rerouteGuideShape = useMemo(() => {
    if (!shouldShowRerouteGuide || !currentLocation) {
      return {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'LineString' as const, coordinates: [] },
      };
    }

    // Prioritize actual road/street network coordinates from OpenStreetMap
    const coords =
      roadRerouteCoordinates && roadRerouteCoordinates.length > 1
        ? roadRerouteCoordinates
        : safestReroute
        ? safestReroute.path.map((p) => [p.longitude, p.latitude])
        : nearestRoute
        ? [
            [currentLocation.longitude, currentLocation.latitude],
            [nearestRoute.point.longitude, nearestRoute.point.latitude],
          ]
        : [];

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: coords,
      },
    };
  }, [
    currentLocation,
    nearestRoute,
    roadRerouteCoordinates,
    safestReroute,
    shouldShowRerouteGuide,
  ]);

  const rerouteTargetShape = useMemo(() => {
    if (!shouldShowRerouteGuide || !safestReroute?.targetPoint) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Point' as const,
        coordinates: [
          safestReroute.targetPoint.longitude,
          safestReroute.targetPoint.latitude,
        ],
      },
    };
  }, [safestReroute?.targetPoint, shouldShowRerouteGuide]);

  const progressPercent = routeMetrics.totalM
    ? Math.max(0, Math.min(100, ((routeMetrics.totalM - remainingM) / routeMetrics.totalM) * 100))
    : 0;

  const navigationMessage =
    remainingM <= 40
      ? 'You are arriving at the trail finish'
      : offRouteM > OFF_ROUTE_THRESHOLD_M
        ? roadInstruction || safestReroute?.instruction || `Return to the route · ${formatDistance(offRouteM)} away`
        : followingUser
          ? 'Following your position'
          : 'Map unlocked · tap recenter to follow';

  // Main Menu / Home Screen
  if (!identifier) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.emptyScreen}>
          <StatusBar style="light" />
          <Image source={require('./assets/icon.png')} style={styles.logoImage} />
          <Text style={styles.brand}>LOCOXPERTS NAVIGATOR</Text>
          <Text style={styles.emptyTitle}>Choose a Trail</Text>
          <Text style={styles.muted}>
            Open any route from LocoXperts web or upload a GPX file directly to start offline navigation.
          </Text>

          <Pressable style={styles.importButton} onPress={importGpx}>
            <Text style={styles.importButtonText}>+ Upload GPX File</Text>
          </Pressable>

          {recentTrails.length > 0 ? (
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>RECENT TRAILS</Text>
              <ScrollView style={styles.recentList} contentContainerStyle={styles.recentListContent}>
                {recentTrails.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.recentCard}
                    onPress={() => loadTrail(item.slug || item.id)}
                  >
                    <View style={styles.recentCardText}>
                      <Text numberOfLines={1} style={styles.recentName}>
                        {item.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.recentLocation}>
                        {item.location} {item.distance_km ? `· ${item.distance_km} km` : ''}
                      </Text>
                    </View>
                    <View style={styles.difficultyBadge}>
                      <Text style={styles.difficultyText}>{item.difficulty}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

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
          <Text style={styles.muted}>Loading trail route…</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!trail || !bounds) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.emptyScreen}>
          <Text style={styles.emptyTitle}>Trail Unavailable</Text>
          <Text style={styles.error}>{error || 'No route coordinates available for this trail.'}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.importButton} onPress={importGpx}>
              <Text style={styles.importButtonText}>Upload GPX file</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={resetTrail}>
              <Text style={styles.secondaryButtonText}>Back to Menu</Text>
            </Pressable>
          </View>
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
          mapStyleUrl={currentMapStyle.url}
          cameraRef={cameraRef}
          bounds={bounds}
          routePadding={routePadding}
          followingUser={followingUser}
          navigating={navigating}
          mapLoaded={mapLoaded}
          routeShape={routeShape}
          routeDirectionArrowsShape={routeDirectionArrowsShape}
          userLocationShape={userLocationShape}
          completedRouteShape={completedRouteShape}
          shouldShowRerouteGuide={shouldShowRerouteGuide}
          rerouteGuideShape={rerouteGuideShape}
          rerouteTargetShape={rerouteTargetShape}
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
          <NavigationHeader
            trail={trail}
            mapError={mapError}
            onReturnToMenu={handleReturnToMenu}
            onShareTrail={handleShareTrail}
          />

          <View style={styles.lowerOverlay} pointerEvents="box-none">
            {showElevation ? (
              <ElevationProfilePanel metrics={elevationMetrics} />
            ) : null}

            <NavigationControls
              followingUser={followingUser}
              navigating={navigating}
              showElevation={showElevation}
              onFocusLocation={focusCurrentLocation}
              onShowEntireRoute={showEntireRoute}
              onResetNorth={handleResetNorth}
              onCycleMapStyle={handleCycleMapStyle}
              onToggleElevation={() => setShowElevation((prev) => !prev)}
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
    padding: 24,
    backgroundColor: '#071711',
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(94, 227, 173, 0.3)',
    marginBottom: 2,
  },
  brand: { color: '#5ee3ad', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  emptyTitle: { color: '#f8fafc', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  muted: { color: '#a7b5ae', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  error: { color: '#fca5a5', fontSize: 14, textAlign: 'center' },
  importButton: {
    minHeight: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: '#1f6c4d',
    borderRadius: 14,
    backgroundColor: '#102c21',
  },
  importButtonText: { color: '#6ee7b7', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    backgroundColor: '#102c21',
  },
  secondaryButtonText: { color: '#a7f3d0', fontSize: 14, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  recentSection: { width: '100%', marginTop: 16, gap: 8 },
  recentTitle: { color: '#6ee7b7', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  recentList: { maxHeight: 220 },
  recentListContent: { gap: 8 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  recentCardText: { flex: 1, gap: 2 },
  recentName: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  recentLocation: { color: '#9fb0a7', fontSize: 12 },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#174d39',
  },
  difficultyText: { color: '#a7f3d0', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  lowerOverlay: { gap: 9 },
});
