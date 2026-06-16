export type Difficulty =
  | 'novice'
  | 'easy'
  | 'moderate'
  | 'hard'
  | 'expert'
  // legacy value kept for backward compatibility with older rows/data payloads
  | 'medium';
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type UserRole = 'participant' | 'expert' | 'admin';

export type SportType =
  | 'mtb'
  | 'downhill_mtb'
  | 'enduro_mtb'
  | 'devotion_trail_rides'
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
  slug?: string;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  sport_type?: SportType | null;
  location: string;
  safety_labels?: string[] | null;
  is_hazardous?: boolean | null;
  hazard_note?: string | null;
  hazard_updated_by?: string | null;
  hazard_updated_at?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
  distance_from_user_km?: number | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  elevation_gain_m: number | null;
  estimated_time_hours: number | null;
  image_url: string | null;
  trail_images?: string[] | null;
  komoot_embed_url?: string | null;
  route_data: RouteData | null;
  created_at: string;
  updated_at: string;
  submitted_by_user_id?: string | null;
  submitted_by_name?: string | null;
  submitted_by_email?: string | null;
  created_by?: string | null;
  expert_name?: string | null;
  built_by_org_name?: string | null;
  verified_by_org_name?: string | null;
  maintained_by_org_name?: string | null;
  associated_expert_count?: number | null;
  trail_builder_count?: number | null;
  campaign_count?: number | null;
  active_campaigns?: Array<{
    id: string;
    title: string;
    description?: string | null;
    target_amount_npr?: string | number | null;
    raised_amount_npr?: string | number | null;
    organization_name?: string | null;
    organization_slug?: string | null;
  }> | null;
  associated_experts?: Array<{
    id: string;
    name: string | null;
    email?: string | null;
    city?: string | null;
    profile_photo_url?: string | null;
    is_verified_expert?: boolean | null;
    average_rating?: number | null;
    review_count?: number | null;
  }> | null;
  status?: string | null;
  is_hidden?: boolean | null;
  onClick?: () => void;
  onViewMap?: () => void;
  onRequestTrail?: () => void;
  onCreateEvent?: () => void;
  onDelete?: () => void;
  onHide?: () => void;
  onUnhide?: () => void;
}

export interface ReviewSummary {
  averageRating: number;
  count: number;
}

export interface TrailReview {
  id: string;
  trail_id: string;
  reviewer_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  reviewer_name?: string | null;
  reviewer_photo_url?: string | null;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  services?: string | null;
  hours?: string | null;
  phone?: string | null;
  website?: string | null;
  is_active: boolean;
  distance_km?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpertReview {
  id: string;
  expert_user_id: string;
  reviewer_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  reviewer_name?: string | null;
  reviewer_photo_url?: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  trail_alert?: string | null;
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
  trail_alert?: string | null;
  trail_id?: string | null;
  event_date: string;
  organizer_name?: string;
  organizer_email?: string;
  max_participants?: number;
  meeting_point?: string;
  difficulty?: Difficulty | null;
  required_expertise: ExpertiseLevel;
  sport_type?: SportType;
  city?: string;
  price_npr?: number;
  qr_image_url?: string;
  host_user_id?: string | null;
  trail_request_id?: string;
}

export interface JoinEventInput {
  participant_name: string;
  participant_email: string;
  phone?: string;
  expertise_level: ExpertiseLevel;
}

export interface ExpertRideProgram {
  id: string;
  expert_user_id: string;
  trail_id: string;
  title: string;
  description: string | null;
  price_npr: number | null;
  max_group_size: number;
  duration_note: string | null;
  meeting_point_note: string | null;
  availability_weekdays?: string[] | null;
  available_time_note?: string | null;
  skill_level: ExpertiseLevel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expert_name?: string | null;
  expert_email?: string | null;
  expert_city?: string | null;
  expert_bio?: string | null;
  expert_profile_photo_url?: string | null;
  expert_availability_weekdays?: string[] | null;
  average_rating?: number | null;
  review_count?: number | null;
  trail_name?: string | null;
  trail_slug?: string | null;
  trail_location?: string | null;
  trail_sport_type?: SportType | null;
  trail_difficulty?: Difficulty | null;
  trail_image_url?: string | null;
}

export interface ExpertRideProgramRequest {
  id: string;
  program_id: string;
  expert_user_id: string;
  trail_id: string;
  requester_user_id: string | null;
  requester_name: string | null;
  requester_email: string;
  requester_phone: string | null;
  preferred_date: string;
  preferred_time: string | null;
  group_size: number;
  offered_price_npr: number | null;
  notes: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  program_title?: string | null;
  trail_name?: string | null;
  trail_slug?: string | null;
  trail_location?: string | null;
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
  is_hidden?: boolean | null;
  average_rating?: number | null;
  review_count?: number | null;
  phone?: string | null;
  phone_verified_at?: string | null;
  availability_weekdays?: string[] | null;
  google_sub?: string | null;
  profile_photo_url?: string | null;
  expert_gallery_photos?: string[] | null;
  verification_years_experience?: string | null;
  verification_certifications?: string | null;
  verification_guiding_history?: string | null;
  verification_safety_training?: string | null;
  verification_achievements?: string | null;
  verification_strava_url?: string | null;
  verification_links?: string | null;
  associated_trails?: Trail[] | null;
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
  refund_status?: 'none' | 'requested' | 'settled' | 'failed';
  refunded_at?: string | null;
  refund_reference?: string | null;
  cancelled_at?: string | null;
  cancellation_policy_snapshot?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount_npr: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
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
