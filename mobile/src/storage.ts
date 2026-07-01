import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationTrail } from './types';

const trailKey = (identifier: string) => `trail:${identifier}`;

export async function cacheTrail(identifier: string, trail: NavigationTrail) {
  await AsyncStorage.multiSet([
    [trailKey(identifier), JSON.stringify(trail)],
    [trailKey(trail.id), JSON.stringify(trail)],
    ...(trail.slug ? [[trailKey(trail.slug), JSON.stringify(trail)] as [string, string]] : []),
  ]);
}

export async function readCachedTrail(identifier: string) {
  const raw = await AsyncStorage.getItem(trailKey(identifier));
  return raw ? (JSON.parse(raw) as NavigationTrail) : null;
}
