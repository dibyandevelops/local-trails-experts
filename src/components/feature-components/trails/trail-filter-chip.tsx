import type { ReactNode } from 'react';

type TrailFilterChipTone = 'green' | 'blue' | 'purple' | 'amber' | 'cyan' | 'slate';

type TrailFilterChipProps = {
  children: ReactNode;
  onRemove: () => void;
  tone?: TrailFilterChipTone;
};

const toneClasses: Record<TrailFilterChipTone, string> = {
  green:
    'border-green-300 bg-green-50 text-green-800 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-200',
  blue:
    'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200',
  purple:
    'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-900/70 dark:bg-purple-950/40 dark:text-purple-200',
  amber:
    'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200',
  cyan:
    'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-200',
  slate:
    'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};

export function TrailFilterChip({
  children,
  onRemove,
  tone = 'green',
}: TrailFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition hover:brightness-95 dark:hover:brightness-110 ${toneClasses[tone]}`}
    >
      {children} x
    </button>
  );
}
