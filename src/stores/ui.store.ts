'use client';

import { create } from 'zustand';
import type { ExpertiseLevel, SportType } from '@/types';

type ThemeMode = 'light' | 'dark';

type EventsFilterDraft = {
  city: string;
  sport: SportType | '';
  expertise: ExpertiseLevel | '';
  expert: string;
  showUpcoming: boolean;
  userExpertise: ExpertiseLevel;
};

export type UiState = {
  theme: ThemeMode;
  joinEventModalOpen: boolean;
  eventsFilterDraft: EventsFilterDraft;
  setTheme: (theme: ThemeMode) => void;
  setJoinEventModalOpen: (open: boolean) => void;
  setEventsFilterDraft: (partial: Partial<EventsFilterDraft>) => void;
};

const initialEventsFilterDraft: EventsFilterDraft = {
  city: 'Kathmandu',
  sport: '',
  expertise: '',
  expert: '',
  showUpcoming: true,
  userExpertise: 'beginner',
};

export const useUiStore = create<UiState>((set) => ({
  theme: 'light',
  joinEventModalOpen: false,
  eventsFilterDraft: initialEventsFilterDraft,
  setTheme: (theme) => set({ theme }),
  setJoinEventModalOpen: (open) => set({ joinEventModalOpen: open }),
  setEventsFilterDraft: (partial) =>
    set((state) => ({
      eventsFilterDraft: {
        ...state.eventsFilterDraft,
        ...partial,
      },
    })),
}));
