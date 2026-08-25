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

/**
 * Computes forward azimuth/bearing in degrees (0° - 360°) from point A to point B.
 */
export function bearingBetween(a: RoutePoint, b: RoutePoint): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const degrees = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const deltaLon = radians(b.longitude - a.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = (degrees(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing);
}

/**
 * Returns human-readable cardinal direction (e.g. N, NE, E, SE, S, SW, W, NW).
 */
export function cardinalDirectionFromBearing(bearingDeg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((bearingDeg % 360) / 45)) % 8;
  return directions[index];
}

export type TurnManeuver = {
  turnType: 'straight' | 'slight_right' | 'right' | 'sharp_right' | 'u_turn' | 'sharp_left' | 'left' | 'slight_left';
  relativeAngle: number;
  instruction: string;
  arrowIcon: string;
};

/**
 * Calculates real-time turn maneuver prompt relative to rider's current orientation.
 */
export function getTurnManeuver(targetBearing: number, riderHeading: number): TurnManeuver {
  const diff = ((targetBearing - riderHeading + 180) % 360) - 180;

  if (Math.abs(diff) <= 22.5) {
    return { turnType: 'straight', relativeAngle: diff, instruction: 'Continue straight', arrowIcon: '↑' };
  }
  if (diff > 22.5 && diff <= 67.5) {
    return { turnType: 'slight_right', relativeAngle: diff, instruction: 'Bear slight right', arrowIcon: '↗' };
  }
  if (diff > 67.5 && diff <= 112.5) {
    return { turnType: 'right', relativeAngle: diff, instruction: 'Turn right', arrowIcon: '→' };
  }
  if (diff > 112.5 && diff <= 157.5) {
    return { turnType: 'sharp_right', relativeAngle: diff, instruction: 'Sharp right', arrowIcon: '⤥' };
  }
  if (Math.abs(diff) > 157.5) {
    return { turnType: 'u_turn', relativeAngle: diff, instruction: 'Turn around', arrowIcon: '↺' };
  }
  if (diff < -22.5 && diff >= -67.5) {
    return { turnType: 'slight_left', relativeAngle: diff, instruction: 'Bear slight left', arrowIcon: '↖' };
  }
  if (diff < -67.5 && diff >= -112.5) {
    return { turnType: 'left', relativeAngle: diff, instruction: 'Turn left', arrowIcon: '←' };
  }
  return { turnType: 'sharp_left', relativeAngle: diff, instruction: 'Sharp left', arrowIcon: '⤦' };
}

export type DirectionArrowPoint = {
  coordinate: [number, number]; // [lon, lat]
  bearing: number;
  alongM: number;
};

/**
 * Samples directional chevron waypoints along the route polyline at regular distance intervals.
 */
export function generateRouteDirectionArrows(
  points: RoutePoint[],
  intervalMeters = 60
): DirectionArrowPoint[] {
  if (points.length < 2) return [];

  const arrows: DirectionArrowPoint[] = [];
  let accumulatedDist = 0;
  let nextTargetDist = intervalMeters / 2;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segDist = metersBetween(p1, p2);

    while (accumulatedDist + segDist >= nextTargetDist) {
      const remainingToTarget = nextTargetDist - accumulatedDist;
      const t = segDist > 0 ? remainingToTarget / segDist : 0;

      const lat = p1.latitude + (p2.latitude - p1.latitude) * t;
      const lon = p1.longitude + (p2.longitude - p1.longitude) * t;
      const bearing = bearingBetween(p1, p2);

      arrows.push({
        coordinate: [lon, lat],
        bearing,
        alongM: Math.round(nextTargetDist),
      });

      nextTargetDist += intervalMeters;
    }

    accumulatedDist += segDist;
  }

  return arrows;
}

/**
 * Fuses Magnetometer compass with GPS Ground Track Doppler Course based on rider velocity.
 * Implements angular deadband thresholding to completely eliminate camera wobble when stationary.
 */
export function fuseSensorHeading(
  compassHeading: number,
  gpsHeading: number | null | undefined,
  speedMps: number | null | undefined,
  currentFilteredHeading: number
): number {
  let rawTargetHeading = compassHeading;

  // If moving at cycling speed (> 4 km/h), GPS ground track is vastly superior to handlebar-distorted compass
  if (speedMps != null && speedMps >= 1.2 && gpsHeading != null && gpsHeading >= 0) {
    rawTargetHeading = gpsHeading;
  } else if (speedMps != null && speedMps >= 0.7 && gpsHeading != null && gpsHeading >= 0) {
    // Smooth transition blend
    rawTargetHeading = smoothCompassHeading(compassHeading, gpsHeading, 0.5);
  }

  // Deadband filter: ignore micro-oscillations below 2 degrees
  const angleDiff = Math.abs(((rawTargetHeading - currentFilteredHeading + 180) % 360) - 180);
  if (angleDiff < 2.0) {
    return currentFilteredHeading;
  }

  // Circular low-pass filter
  return smoothCompassHeading(currentFilteredHeading, rawTargetHeading, 0.28);
}

/**
 * Circular angle smoothing using unit vectors to prevent 359° <-> 0° flip jitter.
 */
export function smoothCompassHeading(currentHeading: number, targetHeading: number, factor = 0.25): number {
  const radCurrent = (currentHeading * Math.PI) / 180;
  const radTarget = (targetHeading * Math.PI) / 180;

  const x = Math.cos(radCurrent) * (1 - factor) + Math.cos(radTarget) * factor;
  const y = Math.sin(radCurrent) * (1 - factor) + Math.sin(radTarget) * factor;

  const smoothed = (Math.atan2(y, x) * 180) / Math.PI;
  return (smoothed + 360) % 360;
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

export type SafestRerouteGuidance = {
  path: RoutePoint[];
  targetPoint: RoutePoint;
  bearingDeg: number;
  cardinalDirection: string;
  distanceM: number;
  instruction: string;
  maneuver: TurnManeuver;
};

/**
 * Computes a direction-aware, tangent-smoothed shortest and safest reconnection path back to the trail.
 * Avoids directing the rider backwards; instead merges forward with the natural trail trajectory.
 */
export function computeSafestRerouteVector(
  currentLocation: RoutePoint,
  route: RoutePoint[],
  riderHeading = 0,
  lookaheadMeters = 25
): SafestRerouteGuidance | null {
  if (route.length < 2) return null;

  const nearest = nearestRoutePoint(currentLocation, route);
  const { cumulativeM, totalM } = routeDistances(route);

  // Target a smooth forward merge point along the trail
  const targetAlongM = Math.min(totalM, nearest.alongM + lookaheadMeters);

  // Find corresponding route coordinate for target along distance
  let targetIndex = nearest.index;
  for (let i = nearest.index; i < cumulativeM.length; i++) {
    if (cumulativeM[i] >= targetAlongM) {
      targetIndex = i;
      break;
    }
  }
  const targetPoint = route[targetIndex] || route[route.length - 1];

  // Generate smooth bezier curve from current position to trail merge point
  const p0 = currentLocation;
  const p3 = targetPoint;

  const nextSegmentIndex = Math.min(route.length - 1, targetIndex + 1);
  const nextPoint = route[nextSegmentIndex] || targetPoint;
  const trailHeadingRad = ((bearingBetween(targetPoint, nextPoint) - 90) * Math.PI) / 180;

  const directDistance = metersBetween(p0, p3);
  const controlDist = directDistance * 0.35;

  const metersPerDegLat = 111_320;
  const metersPerDegLon = Math.max(1, Math.cos((p0.latitude * Math.PI) / 180) * metersPerDegLat);

  const p1: RoutePoint = {
    latitude: p0.latitude + (p3.latitude - p0.latitude) * 0.35,
    longitude: p0.longitude + (p3.longitude - p0.longitude) * 0.35,
  };

  const p2: RoutePoint = {
    latitude: p3.latitude - (Math.sin(trailHeadingRad) * controlDist) / metersPerDegLat,
    longitude: p3.longitude - (Math.cos(trailHeadingRad) * controlDist) / metersPerDegLon,
  };

  const curvePoints: RoutePoint[] = [];
  const steps = 6;
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const lat =
      uuu * p0.latitude +
      3 * uu * t * p1.latitude +
      3 * u * tt * p2.latitude +
      ttt * p3.latitude;
    const lon =
      uuu * p0.longitude +
      3 * uu * t * p1.longitude +
      3 * u * tt * p2.longitude +
      ttt * p3.longitude;

    curvePoints.push({ latitude: lat, longitude: lon });
  }

  const initialBearing = bearingBetween(p0, p3);
  const cardinal = cardinalDirectionFromBearing(initialBearing);
  const roundedDist = Math.round(directDistance);
  const maneuver = getTurnManeuver(initialBearing, riderHeading);

  return {
    path: curvePoints,
    targetPoint: p3,
    bearingDeg: initialBearing,
    cardinalDirection: cardinal,
    distanceM: roundedDist,
    instruction: `${maneuver.arrowIcon} ${maneuver.instruction} in ${roundedDist} m to rejoin trail`,
    maneuver,
  };
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
