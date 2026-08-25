import { useCallback, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import * as DocumentPicker from 'expo-document-picker';
import { fetchNavigationTrail } from '../api';
import { parseGpx } from '../gpx';
import { cacheTrail, getRecentTrails, readCachedTrail, type RecentTrailItem } from '../storage';
import { trailIdentifierFromUrl } from '../url';
import type { NavigationTrail, RoutePoint } from '../types';

export function isValidRoutePoint(point: RoutePoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

export function useTrailLoader() {
  const [identifier, setIdentifier] = useState('');
  const [trail, setTrail] = useState<NavigationTrail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentTrails, setRecentTrails] = useState<RecentTrailItem[]>([]);

  const refreshRecentTrails = useCallback(async () => {
    const list = await getRecentTrails();
    setRecentTrails(list);
  }, []);

  const loadTrail = useCallback(async (nextIdentifier: string) => {
    if (!nextIdentifier) return;
    setIdentifier(nextIdentifier);
    setLoading(true);
    setError('');

    const cached = await readCachedTrail(nextIdentifier);
    if (cached) setTrail(cached);
    else setTrail(null);

    try {
      const fresh = await fetchNavigationTrail(nextIdentifier);
      if ((fresh.route_data?.coordinates || []).filter(isValidRoutePoint).length < 2) {
        throw new Error('This trail does not have a navigation route yet.');
      }
      setTrail(fresh);
      await cacheTrail(nextIdentifier, fresh);
    } catch (requestError) {
      if (!cached) {
        setError(requestError instanceof Error ? requestError.message : 'Could not load trail.');
      }
    } finally {
      setLoading(false);
      refreshRecentTrails();
    }
  }, [refreshRecentTrails]);

  const importGpx = useCallback(async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/gpx+xml', 'application/xml', 'text/xml', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return null;
      const asset = result.assets[0];
      if (!asset) return null;

      const xml = await (await fetch(asset.uri)).text();
      const fallbackName = asset.name.replace(/\.gpx$/i, '') || 'Imported GPX route';
      const importedTrail = parseGpx(xml, fallbackName);

      setIdentifier(importedTrail.id);
      setTrail(importedTrail);
      await cacheTrail(importedTrail.id, importedTrail);
      refreshRecentTrails();
      return importedTrail;
    } catch (importError) {
      const msg = importError instanceof Error ? importError.message : 'Could not import this GPX file.';
      setError(msg);
      throw new Error(msg);
    }
  }, [refreshRecentTrails]);

  const resetTrail = useCallback(() => {
    setIdentifier('');
    setTrail(null);
    setError('');
    refreshRecentTrails();
  }, [refreshRecentTrails]);

  useEffect(() => {
    refreshRecentTrails();
    Linking.getInitialURL().then((url) => loadTrail(trailIdentifierFromUrl(url)));
    const subscription = Linking.addEventListener('url', ({ url }) => {
      loadTrail(trailIdentifierFromUrl(url));
    });
    return () => subscription.remove();
  }, [loadTrail, refreshRecentTrails]);

  return {
    identifier,
    trail,
    setTrail,
    loading,
    error,
    recentTrails,
    setError,
    loadTrail,
    importGpx,
    resetTrail,
    refreshRecentTrails,
  };
}
