'use client';

import { useEffect, useRef, useState } from 'react';

export type ListSelectOption = {
  value: string;
  label: string;
};

type ListSelectDropdownProps = {
  label: string;
  value: string;
  placeholder?: string;
  options: ListSelectOption[];
  emptyLabel?: string;
  onChange: (value: string) => void;
};

export default function ListSelectDropdown({
  label,
  value,
  placeholder = 'Choose option',
  options,
  emptyLabel = 'No options available.',
  onChange,
}: ListSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label || '';

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div ref={rootRef}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-left text-sm text-gray-900 shadow-sm transition hover:border-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          {selectedLabel || placeholder}
        </button>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500"
        >
          ▾
        </span>
        {open && (
          <div
            className="absolute z-20 mt-1 w-full overscroll-contain rounded-lg border border-gray-200 bg-white shadow-lg"
            style={{
              maxHeight: '50vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">{emptyLabel}</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-emerald-50"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
