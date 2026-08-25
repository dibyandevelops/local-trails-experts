import type { ElevationMetrics, RoutePoint } from './types';

export function routeBounds(points: RoutePoint[]): [number, number, number, number] {
  const longitudes = points.map((point) => point.longitude);
  const latitudes = points.map((point) => point.latitude);
  const padding = 0.01;
  return [
    Math.min(...longitudes) - padding,
    Math.min(...latitudes) - padding,
    Math.max(...longitudes) + padding,
    Math.max(...latitudes) + padding,
  ];
}

export function metersBetween(a: RoutePoint, b: RoutePoint) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = radians(b.latitude - a.latitude);
  const deltaLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function distanceFromRoute(location: RoutePoint, route: RoutePoint[]) {
  return nearestRoutePoint(location, route).distanceM;
}

export function routeDistances(route: RoutePoint[]) {
  const cumulativeM = route.map(() => 0);
  for (let index = 1; index < route.length; index += 1) {
    cumulativeM[index] = cumulativeM[index - 1] + metersBetween(route[index - 1], route[index]);
  }
  return { cumulativeM, totalM: cumulativeM.at(-1) || 0 };
}

export function nearestRoutePoint(location: RoutePoint, route: RoutePoint[]) {
  if (!route.length) {
    return {
      index: 0,
      distanceM: Number.POSITIVE_INFINITY,
      alongM: 0,
      point: location,
    };
  }
  if (route.length === 1) {
    return { index: 0, distanceM: metersBetween(location, route[0]), alongM: 0, point: route[0] };
  }

  const cumulativeM = routeDistances(route).cumulativeM;
  const originLat = (location.latitude * Math.PI) / 180;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = Math.max(1, Math.cos(originLat) * metersPerDegreeLat);

  const toXY = (point: RoutePoint) => ({
    x: (point.longitude - location.longitude) * metersPerDegreeLon,
    y: (point.latitude - location.latitude) * metersPerDegreeLat,
  });

  const stride = Math.max(1, Math.ceil((route.length - 1) / 5000));
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestAlongM = 0;
  let closestPoint = route[0];

  const inspectSegment = (index: number) => {
    const a = toXY(route[index]);
    const b = toXY(route[index + 1]);
    const abX = b.x - a.x;
    const abY = b.y - a.y;
    const lengthSquared = abX * abX + abY * abY;
    const t = lengthSquared ? Math.max(0, Math.min(1, -(a.x * abX + a.y * abY) / lengthSquared)) : 0;
    const projectionX = a.x + abX * t;
    const projectionY = a.y + abY * t;
    const distance = Math.hypot(projectionX, projectionY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = t > 0.5 ? index + 1 : index;
      closestAlongM =
        cumulativeM[index] + metersBetween(route[index], route[index + 1]) * t;
      closestPoint = {
        latitude: route[index].latitude + (route[index + 1].latitude - route[index].latitude) * t,
        longitude: route[index].longitude + (route[index + 1].longitude - route[index].longitude) * t,
      };
    }
  };

  for (let index = 0; index < route.length - 1; index += stride) {
    const distance = metersBetween(location, route[index]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }

  const start = Math.max(0, closestIndex - stride * 3);
  const end = Math.min(route.length - 2, closestIndex + stride * 3);
  closestDistance = Number.POSITIVE_INFINITY;
  for (let index = start; index <= end; index += 1) {
    inspectSegment(index);
  }
  return { index: closestIndex, distanceM: closestDistance, alongM: closestAlongM, point: closestPoint };
}

/**
 * Calculates elevation gain, loss, and min/max altitudes along a GPS route.
 */
export function calculateElevationMetrics(points: RoutePoint[]): ElevationMetrics {
  const pointsWithElevation = points.filter(
    (p): p is RoutePoint & { elevation: number } => typeof p.elevation === 'number' && Number.isFinite(p.elevation)
  );

  if (pointsWithElevation.length === 0) {
    return {
      gainM: 0,
      lossM: 0,
      maxAltitudeM: 0,
      minAltitudeM: 0,
      elevationPoints: [],
    };
  }

  let gainM = 0;
  let lossM = 0;
  let maxAltitudeM = pointsWithElevation[0].elevation;
  let minAltitudeM = pointsWithElevation[0].elevation;
  const elevationPoints: Array<{ distanceM: number; elevationM: number }> = [];

  let accumulatedDistance = 0;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      accumulatedDistance += metersBetween(points[i - 1], points[i]);
    }
    const elev = points[i].elevation;
    if (typeof elev === 'number' && Number.isFinite(elev)) {
      elevationPoints.push({
        distanceM: Math.round(accumulatedDistance),
        elevationM: Math.round(elev),
      });
    }
  }

  // Threshold filter for GPS noise/fluctuations (e.g. at least 3m elevation diff to register climb/descent)
  const NOISE_THRESHOLD_M = 2.5;
  for (let i = 1; i < pointsWithElevation.length; i++) {
    const diff = pointsWithElevation[i].elevation - pointsWithElevation[i - 1].elevation;
    maxAltitudeM = Math.max(maxAltitudeM, pointsWithElevation[i].elevation);
    minAltitudeM = Math.min(minAltitudeM, pointsWithElevation[i].elevation);

    if (Math.abs(diff) >= NOISE_THRESHOLD_M) {
      if (diff > 0) {
        gainM += diff;
      } else {
        lossM += Math.abs(diff);
      }
    }
  }

  return {
    gainM: Math.round(gainM),
    lossM: Math.round(lossM),
    maxAltitudeM: Math.round(maxAltitudeM),
    minAltitudeM: Math.round(minAltitudeM),
    elevationPoints,
  };
}

/**
 * Obfuscates the start and end portions of a GPS route to protect personal residential privacy.
 * Clips points within `radiusMeters` (default 200m) from origin and termination points.
 */
export function applyPrivacyZone(points: RoutePoint[], radiusMeters = 200): RoutePoint[] {
  if (points.length < 5) return points;

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  let startIndex = 0;
  while (
    startIndex < points.length - 2 &&
    metersBetween(startPoint, points[startIndex]) < radiusMeters
  ) {
    startIndex++;
  }

  let endIndex = points.length - 1;
  while (
    endIndex > startIndex + 1 &&
    metersBetween(endPoint, points[endIndex]) < radiusMeters
  ) {
    endIndex--;
  }

  const pruned = points.slice(startIndex, endIndex + 1);
  return pruned.length >= 2 ? pruned : points;
}
