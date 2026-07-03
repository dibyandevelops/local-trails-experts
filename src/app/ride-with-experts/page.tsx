import type { Metadata } from 'next';
import RideWithExpertsClient from './ride-with-experts-client';

export const metadata: Metadata = {
  title: 'Ride with Experts in Kathmandu | LocoXperts',
  description:
    'Request MTB rides with verified local experts on Kathmandu and Nepal trails. Choose a trail, preferred date, group size, and coordinate after the expert accepts.',
  keywords: [
    'ride with experts Kathmandu',
    'MTB guides Kathmandu',
    'mountain bike experts Nepal',
    'guided MTB rides Nepal',
    'Kathmandu trail experts',
    'LocoXperts ride support',
  ],
  alternates: { canonical: '/ride-with-experts' },
  openGraph: {
    title: 'Ride with Experts in Kathmandu',
    description:
      'Request MTB rides with verified local experts on Kathmandu and Nepal trails.',
    url: '/ride-with-experts',
    type: 'website',
  },
};

export default function RideWithExpertsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.13),transparent_30%),linear-gradient(180deg,#f7fee7_0%,#ffffff_42%,#f8fafc_100%)] pb-12 text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_28%),linear-gradient(180deg,#07110f_0%,#0f172a_48%,#020617_100%)] dark:text-slate-50">
      <RideWithExpertsClient />
    </div>
  );
}
