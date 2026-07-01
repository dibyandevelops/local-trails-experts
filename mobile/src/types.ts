export type RoutePoint = {
  latitude: number;
  longitude: number;
  elevation?: number;
};

export type NavigationTrail = {
  id: string;
  slug?: string;
  name: string;
  location: string;
  difficulty: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
  estimated_time_hours: number | null;
  latitude: number | null;
  longitude: number | null;
  route_data: { coordinates: RoutePoint[] } | null;
  komoot_url: string | null;
  updated_at: string;
  source?: 'server' | 'gpx';
};
