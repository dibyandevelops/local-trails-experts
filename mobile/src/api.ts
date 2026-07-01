import type { NavigationTrail } from './types';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.locoxperts.com').replace(/\/$/, '');

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error || 'Request failed.');
  return body as T;
}

export async function fetchNavigationTrail(identifier: string) {
  const result = await jsonRequest<{ trail: NavigationTrail }>(
    `/api/navigation/trails/${encodeURIComponent(identifier)}`
  );
  return result.trail;
}
