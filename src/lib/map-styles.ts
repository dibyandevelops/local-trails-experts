export type MapStyleMode = 'satellite' | 'map';

function buildOsmRasterStyle() {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  } as any;
}

function buildEsriSatelliteWithPlacesOverlayStyle() {
  return {
    version: 8,
    sources: {
      esri: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Esri, Maxar, Earthstar Geographics',
      },
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      { id: 'esri-satellite', type: 'raster', source: 'esri' },
      {
        id: 'osm-places-overlay',
        type: 'raster',
        source: 'osm',
        paint: { 'raster-opacity': 0.55 },
      },
    ],
  } as any;
}

export function getMapStyle(mode: MapStyleMode) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const explicitStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

  if (mapboxToken) {
    return mode === 'map'
      ? 'mapbox://styles/mapbox/outdoors-v12'
      : 'mapbox://styles/mapbox/satellite-streets-v12';
  }

  if (mode === 'map') {
    if (explicitStyleUrl) return explicitStyleUrl;
    if (maptilerKey) {
      return `https://api.maptiler.com/maps/streets/style.json?key=${maptilerKey}`;
    }
    return buildOsmRasterStyle();
  }

  // Satellite mode should include places/labels.
  if (maptilerKey) {
    return `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilerKey}`;
  }
  return buildEsriSatelliteWithPlacesOverlayStyle();
}
