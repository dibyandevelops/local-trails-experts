import { RouteData, RoutePoint } from '@/types';
import { parseString } from 'xml2js';

const MIN_DISTANCE_INCREMENT_KM = 0.002; // ignore sub-2m GPS jitter
const MIN_ELEVATION_DELTA_M = 2; // ignore tiny vertical noise spikes

export async function parseGPX(gpxContent: string): Promise<RouteData> {
  return new Promise((resolve, reject) => {
    parseString(gpxContent, (err, result) => {
      if (err) {
        reject(new Error('Invalid GPX file format: ' + err.message));
        return;
      }

      const coordinates: RoutePoint[] = [];
      let totalDistance = 0;
      let elevationGain = 0;
      let elevationLoss = 0;
      let minElevation = Infinity;
      let maxElevation = -Infinity;

      // Extract track points
      const gpx = result.gpx || result;
      const tracks = gpx.trk || [];
      const routes = gpx.rte || [];
      const waypoints = gpx.wpt || [];

      const pointGroups: any[][] = [];

      // Collect point groups from track segments.
      // We must not bridge distances across segment boundaries.
      tracks.forEach((track: any) => {
        const segments = track.trkseg || [];
        segments.forEach((segment: any) => {
          const trkpts = segment.trkpt || [];
          if (trkpts.length > 0) pointGroups.push(trkpts);
        });
      });

      // Collect route points only if no track points exist.
      if (pointGroups.length === 0) {
        routes.forEach((route: any) => {
          const rtepts = route.rtept || [];
          if (rtepts.length > 0) pointGroups.push(rtepts);
        });
      }

      // Fallback to waypoints if no tracks/routes were found.
      if (pointGroups.length === 0 && waypoints.length > 0) {
        pointGroups.push(waypoints);
      }

      pointGroups.forEach((points) => {
        let prevPointInGroup: RoutePoint | undefined;

        points.forEach((point: any) => {
          const lat = Number.parseFloat(String(point?.$?.lat ?? ''));
          const lon = Number.parseFloat(String(point?.$?.lon ?? ''));
          const ele = point.ele?.[0] ?? point.ele;
          const elevation =
            ele !== undefined && ele !== null
              ? Number.parseFloat(String(ele))
              : undefined;

          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            let distance = 0;

            if (prevPointInGroup) {
              const rawDistance = calculateDistance(
                prevPointInGroup.latitude,
                prevPointInGroup.longitude,
                lat,
                lon
              );
              distance =
                rawDistance >= MIN_DISTANCE_INCREMENT_KM ? rawDistance : 0;
              totalDistance += distance;
            }

            if (elevation !== undefined && Number.isFinite(elevation)) {
              if (
                prevPointInGroup?.elevation !== undefined &&
                Number.isFinite(prevPointInGroup.elevation)
              ) {
                const elevDiff = elevation - prevPointInGroup.elevation;
                if (Math.abs(elevDiff) >= MIN_ELEVATION_DELTA_M) {
                  if (elevDiff > 0) {
                    elevationGain += elevDiff;
                  } else {
                    elevationLoss += Math.abs(elevDiff);
                  }
                }
              }
              minElevation = Math.min(minElevation, elevation);
              maxElevation = Math.max(maxElevation, elevation);
            }

            const routePoint: RoutePoint = {
              latitude: lat,
              longitude: lon,
              elevation,
              distance: totalDistance,
            };
            coordinates.push(routePoint);
            prevPointInGroup = routePoint;
          }
        });
      });

      if (coordinates.length === 0) {
        reject(new Error('No valid coordinates found in GPX file'));
        return;
      }

      // If no elevation data, set defaults
      if (minElevation === Infinity) minElevation = 0;
      if (maxElevation === -Infinity) maxElevation = 0;

      resolve({
        coordinates,
        totalDistance,
        elevationGain,
        elevationLoss,
        minElevation,
        maxElevation,
      });
    });
  });
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
