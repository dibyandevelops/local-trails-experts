import { describe, expect, it } from 'vitest';
import { parseGpx } from '../../../mobile/src/gpx';

const validGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LocoXperts test">
  <trk>
    <name>Shivapuri Test Route</name>
    <trkseg>
      <trkpt lat="27.750000" lon="85.330000"><ele>1400</ele></trkpt>
      <trkpt lat="27.751000" lon="85.331000"><ele>1425</ele></trkpt>
      <trkpt lat="27.752000" lon="85.332000"><ele>1415</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('mobile GPX import', () => {
  it('creates a local navigation trail with calculated metrics', () => {
    const trail = parseGpx(validGpx);

    expect(trail.name).toBe('Shivapuri Test Route');
    expect(trail.source).toBe('gpx');
    expect(trail.route_data?.coordinates).toHaveLength(3);
    expect(trail.distance_km).toBeGreaterThan(0.2);
    expect(trail.elevation_gain_m).toBe(25);
  });

  it('rejects files without a usable route', () => {
    expect(() => parseGpx('<gpx><metadata /></gpx>')).toThrow(
      'at least two track points'
    );
  });
});
