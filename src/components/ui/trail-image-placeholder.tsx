'use client';

import * as React from 'react';

type Props = {
  className?: string;
  compact?: boolean;
  label?: string;
};

export default function TrailImagePlaceholder({
  className = '',
  compact = false,
  label = 'Local Trails & Guides',
}: Props) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-950 ${className}`}
      aria-label="Trail image placeholder"
      role="img"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-green-800 via-emerald-700 to-lime-600" />
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,.55) 0 1px, transparent 2px), radial-gradient(circle at 70% 55%, rgba(255,255,255,.45) 0 1px, transparent 2px), radial-gradient(circle at 40% 80%, rgba(255,255,255,.35) 0 1px, transparent 2px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute inset-0 opacity-[0.25]">
        <svg
          viewBox="0 0 200 120"
          className="h-full w-full"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M-10 28 C 20 6, 45 54, 76 30 S 132 40, 158 24 S 210 38, 232 18"
            fill="none"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M-10 70 C 22 44, 48 92, 82 70 S 138 82, 168 66 S 212 82, 232 58"
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M-10 100 C 28 78, 56 124, 94 98 S 152 112, 186 92 S 220 110, 232 88"
            fill="none"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.65"
          />
        </svg>
      </div>

      <div className="relative flex h-full w-full items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon.svg"
          alt=""
          className={compact ? 'h-10 w-10 opacity-95' : 'h-12 w-12 opacity-95'}
        />
      </div>

      {!compact && (
        <div className="absolute bottom-2 left-2 rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          {label}
        </div>
      )}
    </div>
  );
}

