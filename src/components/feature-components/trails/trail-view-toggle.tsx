export type TrailsViewMode = 'grid' | 'quick';

type TrailViewToggleProps = {
  value: TrailsViewMode;
  onChange: (value: TrailsViewMode) => void;
};

export function TrailViewToggle({ value, onChange }: TrailViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 p-1 shadow-sm dark:border-emerald-800/60 dark:bg-slate-950/70">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          value === 'grid'
            ? 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950'
            : 'text-gray-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-950/40'
        }`}
      >
        Default view
      </button>
      <button
        type="button"
        onClick={() => onChange('quick')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          value === 'quick'
            ? 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950'
            : 'text-gray-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-950/40'
        }`}
      >
        Table view
      </button>
    </div>
  );
}
