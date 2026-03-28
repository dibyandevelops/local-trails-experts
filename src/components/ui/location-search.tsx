'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/services/api/client';

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  label: string;
  placeholder?: string;
  countryCodes?: string;
  onSelect: (result: NominatimResult) => void;
};

export default function LocationSearch({
  label,
  placeholder = 'Search location',
  onSelect,
}: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const { data } = await apiClient.get<{ results: NominatimResult[] }>(
          `/api/geo/nominatim?q=${encodeURIComponent(query.trim())}`
        );
        setResults(data.results || []);
      } catch {
        setResults([]);
      }
    }, 350);
  }, [query]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
        {label}
      </label>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      {results.length > 0 && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-slate-950">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => {
                onSelect(result);
                setQuery(result.display_name);
                setResults([]);
              }}
              className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-950/40"
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
