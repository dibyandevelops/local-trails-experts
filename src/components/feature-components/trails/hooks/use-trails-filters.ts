import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { Difficulty } from '@/types';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import { normalizeDifficulty } from '@/services/constants/difficulty';
import { isTrailSort, type RideProfile, type TrailSort } from '../trails-page-options';
import type { TrailsViewMode } from '../trail-view-toggle';

type UseTrailsFiltersParams = {
  searchParams: ReadonlyURLSearchParams;
  createEventOpen: boolean;
  createEventTrailId: string;
  createEventSport: string;
  onCreateEventFromUrl: (trailId: string, sport: string) => void;
};

export function useTrailsFilters({
  searchParams,
  createEventOpen,
  createEventTrailId,
  createEventSport,
  onCreateEventFromUrl,
}: UseTrailsFiltersParams) {
  const didInitFromUrl = useRef(false);
  const didHydrateSearchInput = useRef(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState('');
  const [sport, setSport] = useState('');
  const [distanceMinInput, setDistanceMinInput] = useState('');
  const [distanceMaxInput, setDistanceMaxInput] = useState('');
  const [distanceMin, setDistanceMin] = useState('');
  const [distanceMax, setDistanceMax] = useState('');
  const [rideProfile, setRideProfile] = useState<RideProfile>('');
  const [sort, setSort] = useState<TrailSort>('newest');
  const [draftDifficulty, setDraftDifficulty] = useState<Difficulty | ''>('');
  const [draftSport, setDraftSport] = useState('');
  const [draftRideProfile, setDraftRideProfile] = useState<RideProfile>('');
  const [draftSort, setDraftSort] = useState<TrailSort>('newest');
  const [viewMode, setViewMode] = useState<TrailsViewMode>('grid');
  const [randomSeed] = useState(
    () => `trails-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    if (didInitFromUrl.current) return;
    const urlSearch = (searchParams.get('search') || '').trim();
    const urlDifficulty = normalizeDifficulty((searchParams.get('difficulty') || '').trim()) as
      | Difficulty
      | '';
    const urlLocation = (searchParams.get('location') || '').trim();
    const urlSport = (searchParams.get('sport_type') || searchParams.get('sport') || '').trim();
    const urlDistanceMin = (searchParams.get('distanceMin') || '').trim();
    const urlDistanceMax = (searchParams.get('distanceMax') || '').trim();
    const urlRideProfile = (searchParams.get('rideProfile') || '').trim() as RideProfile;
    const urlSort = (searchParams.get('sort') || '').trim();
    const urlCreateTrail = (searchParams.get('createEventTrail') || '').trim();
    const urlCreateSport = (searchParams.get('createEventSport') || '').trim();
    const urlView = (searchParams.get('view') || '').trim();

    if (urlSearch) {
      setSearchInput(urlSearch);
      setSearch(urlSearch);
    }
    if (urlDifficulty) {
      setDifficulty(urlDifficulty);
    }
    if (urlLocation) {
      setLocationInput(urlLocation);
      setLocation(urlLocation);
    }
    if (urlSport && TRAIL_SPORTS.some((option) => option.value === urlSport)) {
      setSport(urlSport);
    }
    if (urlDistanceMin) {
      setDistanceMinInput(urlDistanceMin);
      setDistanceMin(urlDistanceMin);
    }
    if (urlDistanceMax) {
      setDistanceMaxInput(urlDistanceMax);
      setDistanceMax(urlDistanceMax);
    }
    if (urlRideProfile === 'short' || urlRideProfile === 'medium' || urlRideProfile === 'long') {
      setRideProfile(urlRideProfile);
    }
    if (urlSort && isTrailSort(urlSort)) {
      setSort(urlSort);
    } else {
      setSort('newest');
    }
    if (urlCreateTrail) {
      onCreateEventFromUrl(urlCreateTrail, urlCreateSport || 'mtb');
    }
    setViewMode(urlView === 'quick' ? 'quick' : 'grid');
    didInitFromUrl.current = true;
  }, [onCreateEventFromUrl, searchParams]);

  useEffect(() => {
    if (!didInitFromUrl.current) return;
    if (!didHydrateSearchInput.current) {
      didHydrateSearchInput.current = true;
      return;
    }

    const nextSearch = searchInput.trim();
    const timer = window.setTimeout(() => {
      setSearch((current) => (current === nextSearch ? current : nextSearch));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!didInitFromUrl.current) return;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (difficulty) params.set('difficulty', difficulty);
    if (location) params.set('location', location);
    if (sport) params.set('sport_type', sport);
    if (distanceMin) params.set('distanceMin', distanceMin);
    if (distanceMax) params.set('distanceMax', distanceMax);
    if (rideProfile) params.set('rideProfile', rideProfile);
    if (sort && sort !== 'newest') params.set('sort', sort);
    if (viewMode === 'quick') params.set('view', 'quick');
    if (createEventOpen && createEventTrailId) {
      params.set('createEventTrail', createEventTrailId);
      params.set('createEventSport', createEventSport || 'mtb');
    }
    const query = params.toString();
    const nextUrl = query ? `/trails?${query}` : '/trails';

    if (typeof window !== 'undefined') {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== nextUrl) {
        window.history.replaceState(null, '', nextUrl);
      }
    }
  }, [
    search,
    difficulty,
    location,
    sport,
    distanceMin,
    distanceMax,
    rideProfile,
    sort,
    viewMode,
    createEventOpen,
    createEventTrailId,
    createEventSport,
  ]);

  const filterQuery = useMemo(
    () => ({
      search,
      difficulty,
      location,
      sport,
      distanceMin,
      distanceMax,
      rideProfile,
      sort,
      randomSeed,
    }),
    [search, difficulty, location, sport, distanceMin, distanceMax, rideProfile, sort, randomSeed]
  );

  const hasActiveFilters = Boolean(
    search || difficulty || location || sport || distanceMin || distanceMax || rideProfile || sort !== 'newest'
  );
  const activeFilterCount = [
    search,
    difficulty,
    location,
    sport,
    distanceMin,
    distanceMax,
    rideProfile,
    sort !== 'newest' ? sort : '',
  ].filter(Boolean).length;

  const applySearch = useCallback(() => {
    setSearch(searchInput.trim());
    setLocation(locationInput.trim());
    setDistanceMin(distanceMinInput.trim());
    setDistanceMax(distanceMaxInput.trim());
  }, [distanceMaxInput, distanceMinInput, locationInput, searchInput]);

  const applyDraftFilters = useCallback(() => {
    applySearch();
    setDifficulty(draftDifficulty);
    setSport(draftSport);
    setRideProfile(draftRideProfile);
    setSort(draftSort);
  }, [applySearch, draftDifficulty, draftRideProfile, draftSort, draftSport]);

  const resetFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setDifficulty('');
    setLocationInput('');
    setLocation('');
    setDistanceMinInput('');
    setDistanceMaxInput('');
    setDistanceMin('');
    setDistanceMax('');
    setSport('');
    setRideProfile('');
    setSort('newest');
    setDraftDifficulty('');
    setDraftSport('');
    setDraftRideProfile('');
    setDraftSort('newest');
  }, []);

  const syncDraftFilters = useCallback(() => {
    setSearchInput(search);
    setLocationInput(location);
    setDistanceMinInput(distanceMin);
    setDistanceMaxInput(distanceMax);
    setDraftDifficulty(difficulty);
    setDraftSport(sport);
    setDraftRideProfile(rideProfile);
    setDraftSort(sort);
  }, [difficulty, distanceMax, distanceMin, location, rideProfile, search, sort, sport]);

  return {
    activeFilterCount,
    applyDraftFilters,
    applySearch,
    draftDifficulty,
    draftRideProfile,
    draftSort,
    draftSport,
    filterQuery,
    hasActiveFilters,
    resetFilters,
    searchInput,
    setSearchInput,
    search,
    setSearch,
    difficulty,
    setDifficulty,
    locationInput,
    setLocationInput,
    location,
    setLocation,
    sport,
    setSport,
    distanceMinInput,
    setDistanceMinInput,
    distanceMaxInput,
    setDistanceMaxInput,
    distanceMin,
    setDistanceMin,
    distanceMax,
    setDistanceMax,
    rideProfile,
    setRideProfile,
    sort,
    setSort,
    setDraftDifficulty,
    setDraftRideProfile,
    setDraftSort,
    setDraftSport,
    setViewMode,
    syncDraftFilters,
    viewMode,
  };
}
