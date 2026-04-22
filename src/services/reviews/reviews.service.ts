import { apiClient } from '@/services/api/client';
import type { ExpertReview, ReviewSummary, TrailReview } from '@/types';

export type ReviewListResponse<T> = {
  reviews: T[];
  summary: ReviewSummary;
};

export type ReviewPayload = {
  rating: number;
  comment?: string;
};

export async function fetchTrailReviews(trailId: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<ReviewListResponse<TrailReview>>(
    `/api/trails/${trailId}/reviews`,
    { signal }
  );
  return data;
}

export async function submitTrailReview(trailId: string, payload: ReviewPayload) {
  const { data } = await apiClient.post<{ review: TrailReview }>(
    `/api/trails/${trailId}/reviews`,
    payload
  );
  return data.review;
}

export async function fetchExpertReviews(expertId: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<ReviewListResponse<ExpertReview>>(
    `/api/experts/${expertId}/reviews`,
    { signal }
  );
  return data;
}

export async function submitExpertReview(expertId: string, payload: ReviewPayload) {
  const { data } = await apiClient.post<{ review: ExpertReview }>(
    `/api/experts/${expertId}/reviews`,
    payload
  );
  return data.review;
}

export async function deleteExpertReview(expertId: string) {
  await apiClient.delete(`/api/experts/${expertId}/reviews`);
}
