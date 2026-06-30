import type { Metadata } from 'next';
import ServicesDirectory from '@/components/services/services-directory';

export const metadata: Metadata = {
  title: 'Local MTB and Ride Services',
  description: 'Find ride photography, shuttle transport, graphics, guiding, training, rentals, repair, and event support from Nepal organizations.',
};

export default function ServicesPage() {
  return <ServicesDirectory />;
}
