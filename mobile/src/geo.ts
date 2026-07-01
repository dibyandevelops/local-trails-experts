import type { RoutePoint } from './types';

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
