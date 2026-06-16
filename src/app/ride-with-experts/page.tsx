import type { Metadata } from 'next';
import RideWithExpertsClient from './ride-with-experts-client';

export const metadata: Metadata = {
  title: 'Ride with Local Experts | LocoXperts',
  description:
    'Find expert-led MTB rides, skill sessions, and local trail experiences around Kathmandu.',
};

export default function RideWithExpertsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_30%),linear-gradient(180deg,#f7fee7_0%,#ffffff_44%,#f8fafc_100%)] pb-12 dark:bg-[radial-gradient(circle_at_top_left,rgba(132,204,22,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#020617_0%,#031f18_48%,#020617_100%)]">
      <RideWithExpertsClient />
    </main>
  );
}
