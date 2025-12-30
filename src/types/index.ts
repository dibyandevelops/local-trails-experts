export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  distance?: number;
}

export interface RouteData {
  coordinates: RoutePoint[];
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
}

export interface Trail {
  id: string;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  location: string;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  elevation_gain_m: number | null;
  estimated_time_hours: number | null;
  image_url: string | null;
  route_data: RouteData | null;
  created_at: string;
  updated_at: string;
  onClick?: () => void;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  trail_id: string | null;
  trail?: Trail;
  event_date: string;
  organizer_name: string | null;
  organizer_email: string | null;
  max_participants: number;
  current_participants: number;
  meeting_point: string | null;
  difficulty: Difficulty | null;
  required_expertise: ExpertiseLevel;
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  participant_name: string;
  participant_email: string;
  phone: string | null;
  expertise_level: ExpertiseLevel;
  joined_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  trail_id?: string;
  event_date: string;
  organizer_name?: string;
  organizer_email?: string;
  max_participants?: number;
  meeting_point?: string;
  difficulty?: Difficulty;
  required_expertise: ExpertiseLevel;
}

export interface JoinEventInput {
  participant_name: string;
  participant_email: string;
  phone?: string;
  expertise_level: ExpertiseLevel;
}

