export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="mb-3 text-3xl font-bold text-gray-900">You are offline</h1>
      <p className="text-sm text-gray-600">
        It looks like your internet connection is unavailable. Reconnect and try
        again to continue browsing trails and events.
      </p>
    </div>
  );
}
