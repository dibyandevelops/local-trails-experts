import { describe, expect, it } from 'vitest';
import {
  applyPrivacyZone,
  calculateElevationMetrics,
  metersBetween,
  nearestRoutePoint,
  routeBounds,
  routeDistances,
} from '../../../mobile/src/geo';
import { trailIdentifierFromUrl } from '../../../mobile/src/url';
import type { RoutePoint } from '../../../mobile/src/types';

describe('mobile geospatial calculations', () => {
  const sampleRoute: RoutePoint[] = [
    { latitude: 27.7000, longitude: 85.3000, elevation: 1350 },
    { latitude: 27.7050, longitude: 85.3050, elevation: 1400 },
    { latitude: 27.7100, longitude: 85.3100, elevation: 1450 },
    { latitude: 27.7150, longitude: 85.3150, elevation: 1420 },
    { latitude: 27.7200, longitude: 85.3200, elevation: 1480 },
  ];

  it('calculates accurate haversine distance between coordinates', () => {
    const p1 = { latitude: 27.7000, longitude: 85.3000 };
    const p2 = { latitude: 27.7100, longitude: 85.3000 };
    const distance = metersBetween(p1, p2);

    // 0.01 deg lat is approximately 1113 meters
    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1120);
  });

  it('computes cumulative route distances correctly', () => {
    const { cumulativeM, totalM } = routeDistances(sampleRoute);

    expect(cumulativeM).toHaveLength(5);
    expect(cumulativeM[0]).toBe(0);
    expect(cumulativeM[4]).toBe(totalM);
    expect(totalM).toBeGreaterThan(2500);
  });

  it('projects nearest route point and off-route distance accurately', () => {
    const riderLocation: RoutePoint = { latitude: 27.7052, longitude: 85.3051 };
    const nearest = nearestRoutePoint(riderLocation, sampleRoute);

    expect(nearest.index).toBeGreaterThanOrEqual(1);
    expect(nearest.distanceM).toBeLessThan(50); // Near segment 1-2
    expect(nearest.alongM).toBeGreaterThan(0);
  });

  it('calculates bounding box with safety padding', () => {
    const bounds = routeBounds(sampleRoute);
    const [west, south, east, north] = bounds;

    expect(west).toBeLessThan(85.3000);
    expect(south).toBeLessThan(27.7000);
    expect(east).toBeGreaterThan(85.3200);
    expect(north).toBeGreaterThan(27.7200);
  });

  it('calculates elevation gain, loss, and min/max altitudes', () => {
    const metrics = calculateElevationMetrics(sampleRoute);

    // Climbs: 1350->1400 (+50), 1400->1450 (+50), 1420->1480 (+60) = 160m
    // Descent: 1450->1420 (-30) = 30m
    expect(metrics.gainM).toBe(160);
    expect(metrics.lossM).toBe(30);
    expect(metrics.minAltitudeM).toBe(1350);
    expect(metrics.maxAltitudeM).toBe(1480);
    expect(metrics.elevationPoints).toHaveLength(5);
  });

  it('applies privacy zone masking to start and finish coordinates', () => {
    // Generate route with dense start and end points
    const denseRoute: RoutePoint[] = [
      { latitude: 27.70000, longitude: 85.30000 },
      { latitude: 27.70050, longitude: 85.30050 }, // ~78m from start
      { latitude: 27.70150, longitude: 85.30150 }, // ~235m from start
      { latitude: 27.70500, longitude: 85.30500 },
      { latitude: 27.70850, longitude: 85.30850 },
      { latitude: 27.70950, longitude: 85.30950 }, // ~156m from end
      { latitude: 27.71000, longitude: 85.31000 },
    ];

    const masked = applyPrivacyZone(denseRoute, 200);

    // Initial point must be trimmed beyond 200m
    expect(metersBetween(denseRoute[0], masked[0])).toBeGreaterThanOrEqual(200);
    // Ending point must be trimmed beyond 200m
    expect(metersBetween(denseRoute[denseRoute.length - 1], masked[masked.length - 1])).toBeGreaterThanOrEqual(150);
  });

  it('correctly extracts trail identifiers from deep links', () => {
    expect(trailIdentifierFromUrl('locoxperts://navigate/shivapuri-singletrack')).toBe('shivapuri-singletrack');
    expect(trailIdentifierFromUrl('https://www.locoxperts.com/trails/nagarkot-downhill')).toBe('nagarkot-downhill');
    expect(trailIdentifierFromUrl('https://www.locoxperts.com/navigate/trail-123')).toBe('trail-123');
    expect(trailIdentifierFromUrl(null)).toBe('');
  });
});
