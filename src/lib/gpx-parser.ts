import { RouteData, RoutePoint } from '@/types';
import { parseString } from 'xml2js';

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

      let points: any[] = [];

      // Collect points from tracks
      tracks.forEach((track: any) => {
        const segments = track.trkseg || [];
        segments.forEach((segment: any) => {
          const trkpts = segment.trkpt || [];
          points = points.concat(trkpts);
        });
      });

      // Collect points from routes if no track points
      if (points.length === 0) {
        routes.forEach((route: any) => {
          const rtepts = route.rtept || [];
          points = points.concat(rtepts);
        });
      }

      // Fallback to waypoints if no tracks or routes
      if (points.length === 0) {
        points = waypoints;
      }

      points.forEach((point: any) => {
        const lat = parseFloat(point.$.lat || '0');
        const lon = parseFloat(point.$.lon || '0');
        const ele = point.ele?.[0] || point.ele;
        const elevation = ele ? parseFloat(ele) : undefined;

        if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
          const prevPoint = coordinates[coordinates.length - 1];
          let distance = 0;

          if (prevPoint) {
            distance = calculateDistance(
              prevPoint.latitude,
              prevPoint.longitude,
              lat,
              lon
            );
            totalDistance += distance;
          }

          if (elevation !== undefined && !isNaN(elevation)) {
            if (prevPoint?.elevation !== undefined) {
              const elevDiff = elevation - prevPoint.elevation;
              if (elevDiff > 0) {
                elevationGain += elevDiff;
              } else {
                elevationLoss += Math.abs(elevDiff);
              }
            }
            minElevation = Math.min(minElevation, elevation);
            maxElevation = Math.max(maxElevation, elevation);
          }

          coordinates.push({
            latitude: lat,
            longitude: lon,
            elevation,
            distance: totalDistance,
          });
        }
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

