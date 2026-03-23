import { STRAVA_ENABLED } from '@/lib/feature-flags';

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-600">
          Last updated: March 12, 2026
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
        <p className="text-sm text-gray-700">
          LocoXperts collects the minimum information needed to operate the
          platform, such as your account details, contact information, and
          preferences. We only use your data to provide core features like
          events, trails, and verified expert services.
        </p>
      </section>

      {STRAVA_ENABLED && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Strava Compliance</h2>
          <p className="text-sm text-gray-700">
            If you choose to connect Strava, we access Strava data only with your
            explicit permission and only to power features inside LocoXperts.
            Strava data is visible only to the connected user and is not shared
            with other users. You can disconnect Strava at any time from your
            profile.
          </p>
          <p className="text-xs text-gray-500">
            This product is not affiliated with or sponsored by Strava. Powered
            by Strava.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
        <p className="text-sm text-gray-700">
          If you have any questions about this policy, please contact us at
          {process.env.NEXT_PUBLIC_ADMIN_EMAIL}.
        </p>
      </section>
    </div>
  );
}
