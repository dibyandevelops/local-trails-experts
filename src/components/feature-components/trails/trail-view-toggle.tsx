export type TrailsViewMode = 'grid' | 'quick';

type TrailViewToggleProps = {
  value: TrailsViewMode;
  onChange: (value: TrailsViewMode) => void;
};

export function TrailViewToggle({ value, onChange }: TrailViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          value === 'grid'
            ? 'bg-emerald-600 text-white'
            : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        Default view
      </button>
      <button
        type="button"
        onClick={() => onChange('quick')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          value === 'quick'
            ? 'bg-emerald-600 text-white'
            : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        Quick view
      </button>
    </div>
  );
}
