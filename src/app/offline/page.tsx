export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-green-200 bg-gradient-to-br from-white to-green-50 p-8 text-center shadow-sm dark:border-green-800 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl dark:bg-green-900/30">
        🚴
      </div>
      <h1 className="mb-2 text-3xl font-bold text-green-900 dark:text-green-300">Looks like you&apos;re offline</h1>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        No worries — perfect time to go for a ride. Reconnect when you&apos;re back to continue browsing trails and events.
      </p>
    </div>
  );
}
