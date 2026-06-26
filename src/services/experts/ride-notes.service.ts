import axios from 'axios';
import { apiClient } from '@/services/api/client';
import type {
  AdminRideNote,
  AdminRideNoteCategory,
  AdminRideNoteTrailOption,
} from '@/services/admin/admin.service';

export type ExpertRideNotesResponse = {
  notes: AdminRideNote[];
  trails: AdminRideNoteTrailOption[];
};

export type ExpertRideNoteInput = {
  id?: string;
  title: string;
  excerpt?: string;
  content: string;
  cover_image_url?: string;
  category: AdminRideNoteCategory;
  status: 'draft' | 'pending_review';
  trail_id?: string;
  expert_user_id?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as { error?: string } | undefined;
    return apiError?.error || fallback;
  }
  return fallback;
}

export async function fetchExpertRideNotes() {
  try {
    const { data } = await apiClient.get<ExpertRideNotesResponse>('/api/experts/me/ride-notes');
    return {
      notes: data.notes || [],
      trails: data.trails || [],
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to fetch ride notes'));
  }
}

export async function createExpertRideNote(input: ExpertRideNoteInput) {
  try {
    const { data } = await apiClient.post<{ note: AdminRideNote }>('/api/experts/me/ride-notes', input);
    return data.note;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create ride note'));
  }
}

export async function updateExpertRideNote(input: ExpertRideNoteInput & { id: string }) {
  try {
    const { data } = await apiClient.patch<{ note: AdminRideNote }>('/api/experts/me/ride-notes', input);
    return data.note;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update ride note'));
  }
}

export async function deleteExpertRideNote(noteId: string) {
  try {
    const { data } = await apiClient.delete<{ note: Pick<AdminRideNote, 'id' | 'title'> }>(
      '/api/experts/me/ride-notes',
      { params: { id: noteId } }
    );
    return data.note;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete ride note'));
  }
}
