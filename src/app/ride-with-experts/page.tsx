import type { Metadata } from 'next';
import RideWithExpertsClient from './ride-with-experts-client';

export const metadata: Metadata = {
  title: 'Ride with Guides in Kathmandu | LocoXperts',
  description:
    'Request MTB rides with verified local guides on Kathmandu and Nepal trails. Choose a trail, preferred date, group size, and coordinate after the guide accepts.',
  keywords: [
    'ride with guides Kathmandu',
    'MTB guides Kathmandu',
    'mountain bike guides Nepal',
    'guided MTB rides Nepal',
    'Kathmandu trail guides',
    'LocoXperts ride support',
  ],
  alternates: { canonical: '/ride-with-experts' },
  openGraph: {
    title: 'Ride with Guides in Kathmandu',
    description:
      'Request MTB rides with verified local guides on Kathmandu and Nepal trails.',
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
