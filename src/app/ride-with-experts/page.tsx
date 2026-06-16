import type { Metadata } from 'next';
import RideWithExpertsClient from './ride-with-experts-client';

export const metadata: Metadata = {
  title: 'Ride with Local Experts | LocoXperts',
  description:
    'Request a local ride with verified MTB and trail experts around Kathmandu.',
};

export default function RideWithExpertsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_30%),linear-gradient(180deg,#f0fdf4_0%,#ffffff_48%,#f8fafc_100%)] pb-12 text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.1),transparent_30%),linear-gradient(180deg,#020617_0%,#061712_52%,#020617_100%)] dark:text-slate-50">
      <RideWithExpertsClient />
    </main>
  );
}
