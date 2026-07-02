'use client';

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Trail } from '@/types';

type TrailsPageState = {
  filtersOpen: boolean;
  setFiltersOpen: Dispatch<SetStateAction<boolean>>;
  mapTrailSummary: Trail | null;
  setMapTrailSummary: Dispatch<SetStateAction<Trail | null>>;
  mapTrailId: string | null;
  setMapTrailId: Dispatch<SetStateAction<string | null>>;
  mapOpen: boolean;
  setMapOpen: Dispatch<SetStateAction<boolean>>;
  createEventTrailId: string;
  setCreateEventTrailId: Dispatch<SetStateAction<string>>;
  createEventSport: string;
  setCreateEventSport: Dispatch<SetStateAction<string>>;
  createEventOpen: boolean;
  setCreateEventOpen: Dispatch<SetStateAction<boolean>>;
  requestTrailItem: Trail | null;
  setRequestTrailItem: Dispatch<SetStateAction<Trail | null>>;
  requestOpen: boolean;
  setRequestOpen: Dispatch<SetStateAction<boolean>>;
  galleryOpen: boolean;
  setGalleryOpen: Dispatch<SetStateAction<boolean>>;
  galleryTrailName: string;
  setGalleryTrailName: Dispatch<SetStateAction<string>>;
  galleryImages: string[];
  setGalleryImages: Dispatch<SetStateAction<string[]>>;
  toastOpen: boolean;
  setToastOpen: Dispatch<SetStateAction<boolean>>;
  toastTitle: string;
  setToastTitle: Dispatch<SetStateAction<string>>;
  toastDescription: string;
  setToastDescription: Dispatch<SetStateAction<string>>;
  requestFeedback: string;
  setRequestFeedback: Dispatch<SetStateAction<string>>;
  requestModalMessage: string;
  setRequestModalMessage: Dispatch<SetStateAction<string>>;
};

const TrailsPageStateContext = createContext<TrailsPageState | null>(null);

export function TrailsPageStateProvider({ children }: { children: ReactNode }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapTrailSummary, setMapTrailSummary] = useState<Trail | null>(null);
  const [mapTrailId, setMapTrailId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [createEventTrailId, setCreateEventTrailId] = useState('');
  const [createEventSport, setCreateEventSport] = useState('');
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [requestTrailItem, setRequestTrailItem] = useState<Trail | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTrailName, setGalleryTrailName] = useState('Trail');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState('Request sent');
  const [toastDescription, setToastDescription] = useState(
    'Your trail request has been submitted.'
  );
  const [requestFeedback, setRequestFeedback] = useState('');
  const [requestModalMessage, setRequestModalMessage] = useState('');

  return (
    <TrailsPageStateContext.Provider
      value={{
        filtersOpen,
        setFiltersOpen,
        mapTrailSummary,
        setMapTrailSummary,
        mapTrailId,
        setMapTrailId,
        mapOpen,
        setMapOpen,
        createEventTrailId,
        setCreateEventTrailId,
        createEventSport,
        setCreateEventSport,
        createEventOpen,
        setCreateEventOpen,
        requestTrailItem,
        setRequestTrailItem,
        requestOpen,
        setRequestOpen,
        galleryOpen,
        setGalleryOpen,
        galleryTrailName,
        setGalleryTrailName,
        galleryImages,
        setGalleryImages,
        toastOpen,
        setToastOpen,
        toastTitle,
        setToastTitle,
        toastDescription,
        setToastDescription,
        requestFeedback,
        setRequestFeedback,
        requestModalMessage,
        setRequestModalMessage,
      }}
    >
      {children}
    </TrailsPageStateContext.Provider>
  );
}

export function useTrailsPageState() {
  const state = useContext(TrailsPageStateContext);
  if (!state) {
    throw new Error('useTrailsPageState must be used inside TrailsPageStateProvider');
  }
  return state;
}
