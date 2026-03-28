import { apiClient } from '@/services/api/client';
import type { Store } from '@/types';

export type StoreQuery = {
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
};

export async function fetchStores(query: StoreQuery = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (typeof query.lat === 'number') params.set('lat', String(query.lat));
  if (typeof query.lng === 'number') params.set('lng', String(query.lng));
  if (typeof query.radius === 'number') params.set('radius', String(query.radius));
  if (typeof query.minLat === 'number') params.set('minLat', String(query.minLat));
  if (typeof query.maxLat === 'number') params.set('maxLat', String(query.maxLat));
  if (typeof query.minLng === 'number') params.set('minLng', String(query.minLng));
  if (typeof query.maxLng === 'number') params.set('maxLng', String(query.maxLng));

  const { data } = await apiClient.get<{ stores: Store[] }>(
    `/api/stores${params.toString() ? `?${params.toString()}` : ''}`
  );
  return data.stores;
}
