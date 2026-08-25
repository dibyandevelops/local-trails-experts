import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import {
  computeSafestRerouteVector,
  metersBetween,
  nearestRoutePoint,
  routeDistances,
  smoothCompassHeading,
  type SafestRerouteGuidance,
} from '../geo';
import type { RoutePoint } from '../types';

export const OFF_ROUTE_THRESHOLD_M = 60;
export const LOCATION_TOO_FAR_FROM_ROUTE_M = 100_000;

export function pointFromLocation(location: Location.LocationObject): RoutePoint {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    elevation: location.coords.altitude ?? undefined,
    heading: location.coords.heading ?? undefined,
    timestamp: location.timestamp,
  };
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function formatSpeedKmh(mps: number | null): string {
  if (mps == null || mps < 0) return '0.0';
  return (mps * 3.6).toFixed(1);
}

export function useTrailNavigation(
  route: RoutePoint[],
  cameraRef: React.RefObject<CameraRef | null>,
  bounds: [number, number, number, number] | null
) {
  const [navigating, setNavigating] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [offRouteM, setOffRouteM] = useState(0);
  const [remainingM, setRemainingM] = useState(0);
  const [nearestIndex, setNearestIndex] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<RoutePoint | null>(null);
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [followingUser, setFollowingUser] = useState(false);
  const [rerouteGuideEnabled, setRerouteGuideEnabled] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const headingSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastLocation = useRef<RoutePoint | null>(null);
  const currentHeadingRef = useRef<number>(0);
  const followingUserRef = useRef(false);
  const badLocationWarningShown = useRef(false);

  const routeMetrics = useMemo(() => routeDistances(route), [route]);

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
    [bounds, cameraRef, routePadding]
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

  const setFollowMode = useCallback((enabled: boolean) => {
    followingUserRef.current = enabled;
    setFollowingUser(enabled);
  }, []);

  const nearestRoute = useMemo(
    () => (currentLocation ? nearestRoutePoint(currentLocation, route) : null),
    [currentLocation, route]
  );

  // Computes the shortest and safest forward-merge reconnect trajectory
  const safestReroute = useMemo<SafestRerouteGuidance | null>(() => {
    if (!currentLocation || route.length < 2) return null;
    return computeSafestRerouteVector(currentLocation, route, 25);
  }, [currentLocation, route]);

  const appendPoint = useCallback(
    (location: Location.LocationObject) => {
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
        const effectiveHeading =
          location.coords.heading != null && location.coords.heading >= 0
            ? location.coords.heading
            : currentHeadingRef.current;

        cameraRef.current?.easeTo({
          center: [current.longitude, current.latitude],
          zoom: 16.8,
          pitch: 45,
          ...(effectiveHeading >= 0 ? { bearing: effectiveHeading } : {}),
          duration: 600,
        });
      }
    },
    [cameraRef, fitRoute, isLocationUsableForRoute, locationDistanceFromRoute, route, routeMetrics.totalM, setFollowMode]
  );

  const requestLocation = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      Alert.alert('Location required', 'Allow precise location to navigate this trail.');
      return null;
    }
    return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  }, []);

  const focusCurrentLocation = useCallback(async () => {
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
      zoom: navigating ? 16.8 : 15.5,
      pitch: navigating ? 45 : 0,
      bearing: currentHeadingRef.current,
      duration: 600,
    });
  }, [cameraRef, currentLocation, fitRoute, isLocationUsableForRoute, locationDistanceFromRoute, navigating, requestLocation, setFollowMode]);

  const showEntireRoute = useCallback(() => {
    setFollowMode(false);
    setRerouteGuideEnabled(false);
    setTimeout(() => fitRoute(600), 80);
  }, [fitRoute, setFollowMode]);

  const guideBackToRoute = useCallback(() => {
    if (!currentLocation || !nearestRoute) return;
    setFollowMode(false);
    setRerouteGuideEnabled(true);
    const targetPoint = safestReroute?.targetPoint || nearestRoute.point;

    cameraRef.current?.fitBounds(
      [
        Math.min(currentLocation.longitude, targetPoint.longitude) - 0.003,
        Math.min(currentLocation.latitude, targetPoint.latitude) - 0.003,
        Math.max(currentLocation.longitude, targetPoint.longitude) + 0.003,
        Math.max(currentLocation.latitude, targetPoint.latitude) + 0.003,
      ],
      { padding: routePadding, duration: 600 }
    );
  }, [cameraRef, currentLocation, nearestRoute, routePadding, safestReroute?.targetPoint, setFollowMode]);

  const startNavigation = useCallback(async () => {
    if (route.length < 2) return;
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

    // Watch GPS position
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 2,
        timeInterval: 1500,
      },
      appendPoint
    );

    // Watch hardware magnetometer heading sensor for smooth orientation
    try {
      headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
        const trueOrMag = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
        if (trueOrMag >= 0) {
          const smoothed = smoothCompassHeading(currentHeadingRef.current, trueOrMag, 0.3);
          currentHeadingRef.current = smoothed;
          setUserHeading(smoothed);
        }
      });
    } catch {
      // Heading sensor fallback
    }
  }, [appendPoint, fitRoute, isLocationUsableForRoute, locationDistanceFromRoute, requestLocation, route.length, routeMetrics.totalM, setFollowMode]);

  const stopNavigation = useCallback(() => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    headingSubscription.current?.remove();
    headingSubscription.current = null;
    setNavigating(false);
    setFollowMode(false);
    setRerouteGuideEnabled(false);
  }, [setFollowMode]);

  useEffect(() => {
    return () => {
      locationSubscription.current?.remove();
      headingSubscription.current?.remove();
    };
  }, []);

  return {
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
  };
}
