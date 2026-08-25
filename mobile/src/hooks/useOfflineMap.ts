import { useCallback, useEffect, useState } from 'react';
import { OfflineManager } from '@maplibre/maplibre-react-native';
import type { NavigationTrail } from '../types';

export function useOfflineMap(trail: NavigationTrail | null, bounds: [number, number, number, number] | null, mapStyleUrl: string) {
  const [offlineStatus, setOfflineStatus] = useState('Not downloaded');
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Check if current trail has an existing offline pack
  useEffect(() => {
    if (!trail) {
      setOfflineStatus('Not downloaded');
      setIsOfflineAvailable(false);
      setProgressPercentage(0);
      return;
    }

    let isMounted = true;
    OfflineManager.getPacks()
      .then((packs) => {
        if (!isMounted) return;
        const pack = packs.find((p) => p.metadata?.trailId === trail.id);
        if (pack) {
          setOfflineStatus('Available offline');
          setIsOfflineAvailable(true);
          setProgressPercentage(100);
        } else {
          setOfflineStatus(trail.source === 'gpx' ? 'Route imported · map not downloaded' : 'Not downloaded');
          setIsOfflineAvailable(false);
          setProgressPercentage(0);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOfflineStatus('Status unknown');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [trail]);

  const downloadOfflineMap = useCallback(async () => {
    if (!trail || !bounds) return;
    setIsDownloading(true);
    setOfflineStatus('Starting download…');
    setProgressPercentage(0);

    try {
      const existing = await OfflineManager.getPacks();
      const oldPack = existing.find((pack) => pack.metadata?.trailId === trail.id);
      if (oldPack) {
        setOfflineStatus('Available offline');
        setIsOfflineAvailable(true);
        setIsDownloading(false);
        setProgressPercentage(100);
        return;
      }

      await OfflineManager.createPack(
        {
          mapStyle: mapStyleUrl,
          minZoom: 10,
          maxZoom: 17,
          bounds,
          metadata: { trailId: trail.id, trailName: trail.name },
        },
        (_pack, status) => {
          const percentage = Math.round(status.percentage || 0);
          setProgressPercentage(percentage);
          if (percentage >= 100) {
            setOfflineStatus('Available offline');
            setIsOfflineAvailable(true);
            setIsDownloading(false);
          } else {
            setOfflineStatus(`Downloading ${percentage}%`);
          }
        },
        (_pack, downloadError) => {
          setIsDownloading(false);
          setOfflineStatus(`Download failed: ${downloadError.message}`);
        }
      );
    } catch (downloadError) {
      setIsDownloading(false);
      setOfflineStatus(
        downloadError instanceof Error ? downloadError.message : 'Offline download failed.'
      );
    }
  }, [bounds, mapStyleUrl, trail]);

  const deleteOfflineMap = useCallback(async () => {
    if (!trail) return;
    try {
      await OfflineManager.deletePack(trail.id);
      setOfflineStatus('Not downloaded');
      setIsOfflineAvailable(false);
      setProgressPercentage(0);
    } catch {
      // Ignore cleanup error
    }
  }, [trail]);

  return {
    offlineStatus,
    setOfflineStatus,
    isOfflineAvailable,
    isDownloading,
    progressPercentage,
    downloadOfflineMap,
    deleteOfflineMap,
  };
}
