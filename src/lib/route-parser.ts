// @ts-ignore
import gpxParse from 'gpx-parse';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  distance?: number; // Cumulative distance in meters
}

export interface RouteData {
  coordinates: RoutePoint[];
  totalDistance: number; // in meters
  elevationGain: number; // in meters
  elevationLoss: number; // in meters
  minElevation: number;
  maxElevation: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Parse GPX file and extract route data
 */
export async function parseGPX(gpxContent: string): Promise<RouteData> {
  return new Promise((resolve, reject) => {
    gpxParse.parseGpx(gpxContent, (error: any, data: any) => {
      if (error) {
        reject(new Error(`Failed to parse GPX: ${error.message}`));
        return;
      }

      const coordinates: RoutePoint[] = [];
      let totalDistance = 0;
      let elevationGain = 0;
      let elevationLoss = 0;
      let minElevation = Infinity;
      let maxElevation = -Infinity;

      // Extract points from tracks
      const tracks = data.tracks || [];
      tracks.forEach((track: any) => {
        const segments = track.segments || [];
        segments.forEach((segment: any) => {
          segment.forEach((point: any, index: number) => {
            const lat = parseFloat(point.lat);
            const lon = parseFloat(point.lon);
            const elevation = point.elevation ? parseFloat(point.elevation) : undefined;

            if (isNaN(lat) || isNaN(lon)) {
              return;
            }

            // Calculate cumulative distance
            let distance = 0;
            if (index > 0) {
              const prevPoint = segment[index - 1];
              const prevLat = parseFloat(prevPoint.lat);
              const prevLon = parseFloat(prevPoint.lon);
              distance = calculateDistance(prevLat, prevLon, lat, lon);
              totalDistance += distance;
            }

            // Calculate elevation gain/loss
            if (elevation !== undefined) {
              if (index > 0) {
                const prevElevation = segment[index - 1].elevation
                  ? parseFloat(segment[index - 1].elevation)
                  : undefined;
                if (prevElevation !== undefined) {
                  const elevationDiff = elevation - prevElevation;
                  if (elevationDiff > 0) {
                    elevationGain += elevationDiff;
                  } else {
                    elevationLoss += Math.abs(elevationDiff);
                  }
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
          });
        });
      });

      // Extract points from routes if no tracks found
      if (coordinates.length === 0) {
        const routes = data.routes || [];
        routes.forEach((route: any) => {
          route.forEach((point: any, index: number) => {
            const lat = parseFloat(point.lat);
            const lon = parseFloat(point.lon);
            const elevation = point.elevation ? parseFloat(point.elevation) : undefined;

            if (isNaN(lat) || isNaN(lon)) {
              return;
            }

            let distance = 0;
            if (index > 0) {
              const prevPoint = route[index - 1];
              const prevLat = parseFloat(prevPoint.lat);
              const prevLon = parseFloat(prevPoint.lon);
              distance = calculateDistance(prevLat, prevLon, lat, lon);
              totalDistance += distance;
            }

            if (elevation !== undefined) {
              if (index > 0) {
                const prevElevation = route[index - 1].elevation
                  ? parseFloat(route[index - 1].elevation)
                  : undefined;
                if (prevElevation !== undefined) {
                  const elevationDiff = elevation - prevElevation;
                  if (elevationDiff > 0) {
                    elevationGain += elevationDiff;
                  } else {
                    elevationLoss += Math.abs(elevationDiff);
                  }
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
          });
        });
      }

      if (coordinates.length === 0) {
        reject(new Error('No route data found in GPX file'));
        return;
      }

      resolve({
        coordinates,
        totalDistance,
        elevationGain: Math.round(elevationGain),
        elevationLoss: Math.round(elevationLoss),
        minElevation: minElevation === Infinity ? 0 : Math.round(minElevation),
        maxElevation: maxElevation === -Infinity ? 0 : Math.round(maxElevation),
      });
    });
  });
}

/**
 * Parse GeoJSON file and extract route data
 */
export function parseGeoJSON(geoJsonContent: string): RouteData {
  const geoJson = JSON.parse(geoJsonContent);
  const coordinates: RoutePoint[] = [];
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  // Handle FeatureCollection
  const features = geoJson.type === 'FeatureCollection' ? geoJson.features : [geoJson];

  features.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      coords.forEach((coord: number[], index: number) => {
        const lon = coord[0];
        const lat = coord[1];
        const elevation = coord.length > 2 ? coord[2] : undefined;

        let distance = 0;
        if (index > 0) {
          const prevCoord = coords[index - 1];
          distance = calculateDistance(prevCoord[1], prevCoord[0], lat, lon);
          totalDistance += distance;
        }

        if (elevation !== undefined) {
          if (index > 0) {
            const prevElevation = coords[index - 1].length > 2 ? coords[index - 1][2] : undefined;
            if (prevElevation !== undefined) {
              const elevationDiff = elevation - prevElevation;
              if (elevationDiff > 0) {
                elevationGain += elevationDiff;
              } else {
                elevationLoss += Math.abs(elevationDiff);
              }
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
      });
    }
  });

  if (coordinates.length === 0) {
    throw new Error('No route data found in GeoJSON file');
  }

  return {
    coordinates,
    totalDistance,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    minElevation: minElevation === Infinity ? 0 : Math.round(minElevation),
    maxElevation: maxElevation === -Infinity ? 0 : Math.round(maxElevation),
  };
}

