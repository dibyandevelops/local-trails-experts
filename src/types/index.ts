export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type UserRole = 'participant' | 'expert' | 'admin';

export type SportType =
  | 'mtb'
  | 'hiking'
  | 'trail_running'
  | 'training'
  | 'local_tour'
  | 'road_cycling'
  | 'xc_trails'
  | 'gravel_rides';

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
  sport_type?: SportType | null;
  location: string;
  safety_labels?: string[] | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  elevation_gain_m: number | null;
  estimated_time_hours: number | null;
  image_url: string | null;
  trail_images?: string[] | null;
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
  organizer_phone?: string | null;
  max_participants: number;
  current_participants: number;
  meeting_point: string | null;
  difficulty: Difficulty | null;
  required_expertise: ExpertiseLevel;
   sport_type: SportType | null;
   city: string | null;
  price_npr: number;
  qr_image_url?: string | null;
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
  qr_image_url?: string;
  host_user_id?: string | null;
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
  phone?: string | null;
  phone_verified_at?: string | null;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  password_updated_at?: string | null;
}

export interface Booking {
  id: string;
  event_id: string;
  user_id: string;
  spots: number;
  total_price_npr: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  refund_npr?: number;
  cancelled_at?: string | null;
  cancellation_policy_snapshot?: string | null;
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
