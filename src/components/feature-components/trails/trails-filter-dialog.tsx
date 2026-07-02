import type { FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Difficulty } from '@/types';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import { TRAIL_DIFFICULTY_OPTIONS } from '@/services/constants/difficulty';
import {
  RIDE_PROFILE_QUICK_FILTERS,
  TRAIL_SORT_OPTIONS,
  type RideProfile,
  type TrailSort,
} from './trails-page-options';

type TrailsFilterDialogProps = {
  open: boolean;
  difficulty: Difficulty | '';
  location: string;
  distanceMin: string;
  distanceMax: string;
  sport: string;
  sort: TrailSort;
  rideProfile: RideProfile;
  onOpenChange: (open: boolean) => void;
  onDifficultyChange: (value: Difficulty | '') => void;
  onLocationChange: (value: string) => void;
  onDistanceMinChange: (value: string) => void;
  onDistanceMaxChange: (value: string) => void;
  onSportChange: (value: string) => void;
  onSortChange: (value: TrailSort) => void;
  onRideProfileChange: (value: RideProfile) => void;
  onApply: () => void;
  onReset: () => void;
};

const fieldClass =
  'w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function TrailsFilterDialog({
  open,
  difficulty,
  location,
  distanceMin,
  distanceMax,
  sport,
  sort,
  rideProfile,
  onOpenChange,
  onDifficultyChange,
  onLocationChange,
  onDistanceMinChange,
  onDistanceMaxChange,
  onSportChange,
  onSortChange,
  onRideProfileChange,
  onApply,
  onReset,
}: TrailsFilterDialogProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-emerald-900/60 dark:bg-slate-950 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-950 dark:text-slate-50">
                Filter trails
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Narrow results by difficulty, location, sport, distance, and ride profile.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Trail filters">
            <FilterField label="Difficulty" htmlFor="trails-difficulty">
              <select id="trails-difficulty" value={difficulty} onChange={(event) => onDifficultyChange(event.target.value as Difficulty | '')} className={fieldClass}>
                <option value="">All</option>
                {TRAIL_DIFFICULTY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FilterField>
            <FilterField label="Location" htmlFor="trails-location">
              <input id="trails-location" value={location} onChange={(event) => onLocationChange(event.target.value)} placeholder="City or region..." className={fieldClass} />
            </FilterField>
            <FilterField label="Min distance (km)" htmlFor="trails-distance-min">
              <input id="trails-distance-min" type="number" min="0" value={distanceMin} onChange={(event) => onDistanceMinChange(event.target.value)} placeholder="e.g. 10" className={fieldClass} />
            </FilterField>
            <FilterField label="Max distance (km)" htmlFor="trails-distance-max">
              <input id="trails-distance-max" type="number" min="0" value={distanceMax} onChange={(event) => onDistanceMaxChange(event.target.value)} placeholder="e.g. 40" className={fieldClass} />
            </FilterField>
            <FilterField label="Category" htmlFor="trails-sport-modal">
              <select id="trails-sport-modal" value={sport} onChange={(event) => onSportChange(event.target.value)} className={fieldClass}>
                <option value="">All categories</option>
                {TRAIL_SPORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FilterField>
            <FilterField label="Sort" htmlFor="trails-sort-modal">
              <select id="trails-sort-modal" value={sort} onChange={(event) => onSortChange(event.target.value as TrailSort)} className={fieldClass}>
                {TRAIL_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FilterField>
            <FilterField label="Ride profile" htmlFor="trails-ride-profile-modal">
              <select id="trails-ride-profile-modal" value={rideProfile} onChange={(event) => onRideProfileChange(event.target.value as RideProfile)} className={fieldClass}>
                {RIDE_PROFILE_QUICK_FILTERS.map((option) => <option key={option.value || 'all-rides'} value={option.value}>{option.label}</option>)}
              </select>
            </FilterField>
            <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="submit" className="w-full rounded-2xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300 sm:w-auto">Apply filters</button>
              <button type="button" onClick={onReset} className="w-full rounded-2xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto">Reset all</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
