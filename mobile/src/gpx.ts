import { metersBetween } from './geo';
import type { NavigationTrail, RoutePoint } from './types';

const MAX_GPX_POINTS = 200_000;

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function readAttribute(attributes: string, name: string) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1] || '';
}

export function parseGpx(xml: string, fallbackName = 'Imported GPX route'): NavigationTrail {
  if (!/<gpx\b/i.test(xml)) throw new Error('The selected file is not a valid GPX document.');

  const points: RoutePoint[] = [];
  const pointPattern = /<(?:trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/(?:trkpt|rtept)>|<(?:trkpt|rtept)\b([^>]*)\/>/gi;
  let match: RegExpExecArray | null;
  while ((match = pointPattern.exec(xml))) {
    if (points.length >= MAX_GPX_POINTS) {
      throw new Error(`GPX files are limited to ${MAX_GPX_POINTS.toLocaleString()} points.`);
    }
    const attributes = match[1] || match[3] || '';
    const body = match[2] || '';
    const latitude = Number(readAttribute(attributes, 'lat'));
    const longitude = Number(readAttribute(attributes, 'lon'));
    const elevationMatch = body.match(/<ele\b[^>]*>\s*([-+]?\d+(?:\.\d+)?)\s*<\/ele>/i);
    const elevation = elevationMatch ? Number(elevationMatch[1]) : undefined;
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) {
      throw new Error('The GPX file contains an invalid coordinate.');
    }
    points.push({
      latitude,
      longitude,
      ...(Number.isFinite(elevation) ? { elevation } : {}),
    });
  }

  if (points.length < 2) throw new Error('The GPX file must contain at least two track points.');

  let distanceM = 0;
  let elevationGainM = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceM += metersBetween(points[index - 1], points[index]);
    const previousElevation = points[index - 1].elevation;
    const elevation = points[index].elevation;
    if (previousElevation != null && elevation != null && elevation > previousElevation) {
      elevationGainM += elevation - previousElevation;
    }
  }

  const nameMatch = xml.match(/<(?:trk|rte)>[\s\S]*?<name\b[^>]*>([\s\S]*?)<\/name>/i);
  const name = nameMatch?.[1] ? decodeXmlText(nameMatch[1].trim()) : fallbackName;
  const now = new Date().toISOString();
  return {
    id: `gpx-${Date.now()}`,
    name,
    location: 'Imported GPX file',
    difficulty: 'unknown',
    distance_km: Number((distanceM / 1000).toFixed(2)),
    elevation_gain_m: Math.round(elevationGainM),
    estimated_time_hours: null,
    latitude: points[0].latitude,
    longitude: points[0].longitude,
    route_data: { coordinates: points },
    komoot_url: null,
    updated_at: now,
    source: 'gpx',
  };
}
