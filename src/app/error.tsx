'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error boundary:', error);
  }, [error]);

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
      <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
        We ran into an issue
      </h2>
      <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
        Try again. If this keeps happening on mobile, refresh the app.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
