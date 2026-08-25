import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationTrail } from './types';

const trailKey = (identifier: string) => `trail:${identifier}`;
const RECENT_TRAILS_KEY = 'recent_trails';

export type RecentTrailItem = {
  id: string;
  slug?: string;
  name: string;
  location: string;
  difficulty: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
  updated_at: string;
};

export async function cacheTrail(identifier: string, trail: NavigationTrail) {
  await AsyncStorage.multiSet([
    [trailKey(identifier), JSON.stringify(trail)],
    [trailKey(trail.id), JSON.stringify(trail)],
    ...(trail.slug ? [[trailKey(trail.slug), JSON.stringify(trail)] as [string, string]] : []),
  ]);
  await saveRecentTrail(trail);
}

export async function readCachedTrail(identifier: string) {
  const raw = await AsyncStorage.getItem(trailKey(identifier));
  return raw ? (JSON.parse(raw) as NavigationTrail) : null;
}

export async function saveRecentTrail(trail: NavigationTrail) {
  try {
    const recents = await getRecentTrails();
    const filtered = recents.filter((t) => t.id !== trail.id);
    const updated: RecentTrailItem[] = [
      {
        id: trail.id,
        slug: trail.slug,
        name: trail.name,
        location: trail.location,
        difficulty: trail.difficulty,
        distance_km: trail.distance_km,
        elevation_gain_m: trail.elevation_gain_m,
        updated_at: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 5);

    await AsyncStorage.setItem(RECENT_TRAILS_KEY, JSON.stringify(updated));
  } catch {
    // Best-effort cache
  }
}

export async function getRecentTrails(): Promise<RecentTrailItem[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_TRAILS_KEY);
    return raw ? (JSON.parse(raw) as RecentTrailItem[]) : [];
  } catch {
    return [];
  }
}
