'use client';

import { useEffect, useState } from 'react';
import { getMapLibreCompatibleMapStyle, type MapStyleMode } from '@/lib/map-styles';

const STORAGE_KEY = 'mtb_map_style_mode';

export function useTrailsMapStyle() {
  const [mode, setMode] = useState<MapStyleMode>(() => {
    if (typeof window === 'undefined') return 'map';
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'map' || saved === 'satellite' ? saved : 'map';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage may be unavailable in private browsing contexts.
    }
  }, [mode]);

  return {
    mapStyle: getMapLibreCompatibleMapStyle(mode),
    mapStyleMode: mode,
    setMapStyleMode: setMode,
  };
}
