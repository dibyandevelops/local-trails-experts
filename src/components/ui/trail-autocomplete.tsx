'use client';

import { Search, X } from 'lucide-react';
import type { Trail } from '@/types';
import { getDifficultyLabel } from '@/services/constants/difficulty';
import { getSportLabel } from '@/services/constants/sports';

type TrailAutocompleteProps = {
  label: string;
  query: string;
  value?: Trail | null;
  options: Trail[];
  isLoading?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  helperText?: string;
  onQueryChange: (query: string) => void;
  onChange: (trail: Trail | null) => void;
};

function formatTrailMeta(trail: Trail) {
  const parts = [
    trail.location,
    trail.difficulty ? getDifficultyLabel(trail.difficulty) : '',
    trail.sport_type ? getSportLabel(trail.sport_type) || trail.sport_type : '',
  ].filter(Boolean);

  return parts.join(' • ');
}

export default function TrailAutocomplete({
  label,
  query,
  value,
  options,
  isLoading = false,
  required = false,
  disabled = false,
  placeholder = 'Search trails by name or location',
  emptyMessage = 'No matching trails found.',
  helperText,
  onQueryChange,
  onChange,
}: TrailAutocompleteProps) {
  const showOptions = !disabled && query.trim().length > 0 && !value;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>

      {value ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-950 dark:text-slate-50">{value.name}</p>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-300">{formatTrailMeta(value)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                onQueryChange('');
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white text-gray-600 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-emerald-950/60"
              aria-label={`Clear selected trail ${value.name}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <input
            required={required}
            disabled={disabled}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400"
            role="combobox"
            aria-expanded={showOptions}
            aria-autocomplete="list"
          />

          {showOptions && (
            <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-950">
              {isLoading ? (
                <div className="px-3 py-3 text-sm text-gray-500 dark:text-slate-400">Searching trails...</div>
              ) : options.length > 0 ? (
                options.map((trail) => (
                  <button
                    key={trail.id}
                    type="button"
                    onClick={() => {
                      onChange(trail);
                      onQueryChange(trail.name);
                    }}
                    className="block w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/45"
                  >
                    <span className="block text-sm font-semibold text-gray-950 dark:text-slate-50">
                      {trail.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-600 dark:text-slate-300">
                      {formatTrailMeta(trail)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-gray-500 dark:text-slate-400">{emptyMessage}</div>
              )}
            </div>
          )}
        </div>
      )}

      {helperText ? <p className="text-xs text-gray-500 dark:text-slate-400">{helperText}</p> : null}
    </div>
  );
}
