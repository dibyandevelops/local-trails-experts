import { describe, expect, it } from 'vitest';
import {
  applyPrivacyZone,
  bearingBetween,
  calculateElevationMetrics,
  cardinalDirectionFromBearing,
  computeSafestRerouteVector,
  fuseSensorHeading,
  generateRouteDirectionArrows,
  getTurnManeuver,
  metersBetween,
  nearestRoutePoint,
  routeBounds,
  routeDistances,
  smoothCompassHeading,
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

  it('computes accurate bearing and cardinal directions', () => {
    const northPt = { latitude: 27.7100, longitude: 85.3000 };
    const eastPt = { latitude: 27.7000, longitude: 85.3100 };
    const origin = { latitude: 27.7000, longitude: 85.3000 };

    const northBearing = bearingBetween(origin, northPt);
    expect(northBearing).toBe(0);
    expect(cardinalDirectionFromBearing(northBearing)).toBe('N');

    const eastBearing = bearingBetween(origin, eastPt);
    expect(eastBearing).toBe(90);
    expect(cardinalDirectionFromBearing(eastBearing)).toBe('E');
  });

  it('generates directional chevron arrows along route at specified intervals', () => {
    const arrows = generateRouteDirectionArrows(sampleRoute, 25);

    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows.length).toBeLessThanOrEqual(25);
    expect(arrows[0].bearing).toBeDefined();
    expect(arrows[0].coordinate).toHaveLength(2);
    // Route goes generally North-East (~45°)
    expect(arrows[0].bearing).toBeGreaterThanOrEqual(30);
    expect(arrows[0].bearing).toBeLessThanOrEqual(60);
  });

  it('calculates relative turn maneuvers correctly', () => {
    // Rider facing North (0°), target is East (90°) -> Turn right (→)
    const rightManeuver = getTurnManeuver(90, 0);
    expect(rightManeuver.turnType).toBe('right');
    expect(rightManeuver.arrowIcon).toBe('→');

    // Rider facing East (90°), target is East (90°) -> Continue straight (↑)
    const straightManeuver = getTurnManeuver(90, 90);
    expect(straightManeuver.turnType).toBe('straight');
    expect(straightManeuver.arrowIcon).toBe('↑');

    // Rider facing North (0°), target is South (180°) -> Turn around (↺)
    const uTurnManeuver = getTurnManeuver(180, 0);
    expect(uTurnManeuver.turnType).toBe('u_turn');
    expect(uTurnManeuver.arrowIcon).toBe('↺');
  });

  it('fuses sensor heading with speed-based weighting and deadband filter', () => {
    // When moving fast (speed = 3.5 m/s ≈ 12.6 km/h), GPS course dominates
    const fastFused = fuseSensorHeading(180, 90, 3.5, 90);
    expect(Math.round(fastFused)).toBe(90);

    // When stationary (speed = 0), compass dominates
    const stationaryFused = fuseSensorHeading(180, 90, 0, 180);
    expect(Math.round(stationaryFused)).toBe(180);

    // Deadband test: micro-oscillation under 2° should not change filtered heading
    const deadbandResult = fuseSensorHeading(181.2, null, 0, 180);
    expect(deadbandResult).toBe(180);
  });

  it('smooths compass heading avoiding 359 to 0 flip glitch', () => {
    // Rotating slightly across North boundary: from 358° to 2°
    const smoothed = smoothCompassHeading(358, 2, 0.5);
    expect(smoothed >= 359 || smoothed <= 1).toBe(true);
  });

  it('computes smooth forward-merging safest reroute vector with turn maneuver', () => {
    // Rider is 80m West of the middle of the trail, facing North (0°)
    const offTrailRider: RoutePoint = { latitude: 27.7080, longitude: 85.3060 };
    const reroute = computeSafestRerouteVector(offTrailRider, sampleRoute, 0, 30);

    expect(reroute).not.toBeNull();
    expect(reroute!.path.length).toBeGreaterThanOrEqual(4);
    expect(reroute!.distanceM).toBeGreaterThan(0);
    expect(reroute!.maneuver).toBeDefined();
    expect(reroute!.instruction).toContain('rejoin trail');
    expect(reroute!.targetPoint.latitude).toBeGreaterThan(27.7050);
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

    expect(metrics.gainM).toBe(160);
    expect(metrics.lossM).toBe(30);
    expect(metrics.minAltitudeM).toBe(1350);
    expect(metrics.maxAltitudeM).toBe(1480);
    expect(metrics.elevationPoints).toHaveLength(5);
  });

  it('applies privacy zone masking to start and finish coordinates', () => {
    const denseRoute: RoutePoint[] = [
      { latitude: 27.70000, longitude: 85.30000 },
      { latitude: 27.70050, longitude: 85.30050 },
      { latitude: 27.70150, longitude: 85.30150 },
      { latitude: 27.70500, longitude: 85.30500 },
      { latitude: 27.70850, longitude: 85.30850 },
      { latitude: 27.70950, longitude: 85.30950 },
      { latitude: 27.71000, longitude: 85.31000 },
    ];

    const masked = applyPrivacyZone(denseRoute, 200);

    expect(metersBetween(denseRoute[0], masked[0])).toBeGreaterThanOrEqual(200);
    expect(metersBetween(denseRoute[denseRoute.length - 1], masked[masked.length - 1])).toBeGreaterThanOrEqual(150);
  });

  it('correctly extracts trail identifiers from deep links', () => {
    expect(trailIdentifierFromUrl('locoxperts://navigate/shivapuri-singletrack')).toBe('shivapuri-singletrack');
    expect(trailIdentifierFromUrl('https://www.locoxperts.com/trails/nagarkot-downhill')).toBe('nagarkot-downhill');
    expect(trailIdentifierFromUrl('https://www.locoxperts.com/navigate/trail-123')).toBe('trail-123');
    expect(trailIdentifierFromUrl(null)).toBe('');
  });
});
