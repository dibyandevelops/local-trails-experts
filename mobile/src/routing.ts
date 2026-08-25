import type { RoutePoint } from './types';
import { metersBetween } from './geo';

export type RoadNavigationStep = {
  instruction: string;
  name: string;
  distanceM: number;
  durationSec: number;
};

export type RoadRouteResult = {
  coordinates: [number, number][];
  distanceM: number;
  durationSec: number;
  steps: RoadNavigationStep[];
  instruction: string;
  success: boolean;
};

const routeCache = new Map<string, { result: RoadRouteResult; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute cache

/**
 * Fetches real road-following bicycle/access routing from OpenStreetMap OSRM.
 * Returns exact road polylines that follow streets, bridges, and paths.
 */
export async function fetchRoadRoute(
  from: RoutePoint,
  to: RoutePoint
): Promise<RoadRouteResult> {
  const directDistance = metersBetween(from, to);

  // If extremely close (< 8m), return direct segment
  if (directDistance < 8) {
    return {
      coordinates: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
      distanceM: Math.round(directDistance),
      durationSec: 10,
      steps: [],
      instruction: 'Rejoining trail',
      success: true,
    };
  }

  const cacheKey = `${from.latitude.toFixed(4)},${from.longitude.toFixed(4)}->${to.latitude.toFixed(4)},${to.longitude.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/bike/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson&steps=true`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const primaryRoute = data.routes[0];
        const coordinates: [number, number][] = primaryRoute.geometry.coordinates;
        const distanceM = Math.round(primaryRoute.distance);
        const durationSec = Math.round(primaryRoute.duration);

        const steps: RoadNavigationStep[] = [];
        let firstTurnText = `Follow road ${distanceM} m to trail`;

        if (primaryRoute.legs && primaryRoute.legs[0]?.steps) {
          for (const step of primaryRoute.legs[0].steps) {
            const stepName = step.name || 'access road';
            const stepDist = Math.round(step.distance);
            const maneuverType = step.maneuver?.type || 'turn';
            const modifier = step.maneuver?.modifier || '';

            let stepInstruction = `Continue on ${stepName}`;
            if (maneuverType === 'depart') {
              stepInstruction = `Head ${modifier} on ${stepName}`;
            } else if (maneuverType === 'arrive') {
              stepInstruction = 'Rejoin trail';
            } else if (modifier) {
              stepInstruction = `Turn ${modifier} onto ${stepName}`;
            }

            steps.push({
              instruction: stepInstruction,
              name: stepName,
              distanceM: stepDist,
              durationSec: Math.round(step.duration),
            });
          }

          if (steps.length > 0) {
            firstTurnText = steps[0].instruction;
            if (steps[0].distanceM > 0) {
              firstTurnText += ` (${steps[0].distanceM} m)`;
            }
          }
        }

        const result: RoadRouteResult = {
          coordinates,
          distanceM,
          durationSec,
          steps,
          instruction: firstTurnText,
          success: true,
        };

        routeCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }
    }
  } catch {
    // Network or timeout failure -> fall back to interpolated connector
  }

  // Offline / Fallback straight connector
  return {
    coordinates: [
      [from.longitude, from.latitude],
      [to.longitude, to.latitude],
    ],
    distanceM: Math.round(directDistance),
    durationSec: Math.round((directDistance / 4.0)), // ~14 km/h ride speed
    steps: [],
    instruction: `Head towards trail (${Math.round(directDistance)} m)`,
    success: false,
  };
}
