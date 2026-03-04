'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Global app error:', error);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
          <div className="w-full rounded-xl border border-red-900/60 bg-red-950/30 p-6 text-center">
            <h1 className="text-xl font-semibold text-red-200">App crashed unexpectedly</h1>
            <p className="mt-2 text-sm text-red-300">
              Please try resetting this screen. If it still fails, reload the app.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-red-700 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/40"
              >
                Reload
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
