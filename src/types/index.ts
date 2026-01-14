export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type UserRole = 'participant' | 'expert' | 'admin';

export type SportType =
  | 'mtb'
  | 'hiking'
  | 'trail_running'
  | 'training'
  | 'local_tour';

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
   sport_type: SportType | null;
   city: string | null;
   price_npr: number;
   host_user_id?: string | null;
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
  sport_type?: SportType;
  city?: string;
  price_npr?: number;
}

export interface JoinEventInput {
  participant_name: string;
  participant_email: string;
  phone?: string;
  expertise_level: ExpertiseLevel;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  bio: string | null;
  city: string | null;
  sports: string[] | null;
  is_verified_expert: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  event_id: string;
  user_id: string;
  spots: number;
  total_price_npr: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount_npr: number;
  status: 'pending' | 'paid' | 'failed';
  qr_payload: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  event_id: string;
  reviewer_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

