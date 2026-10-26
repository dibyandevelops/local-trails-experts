import type { Metadata } from 'next';
import ServicesDirectory from '@/components/services/services-directory';

export const metadata: Metadata = {
  title: 'Business IT and Local Cycling Services | LocoXperts',
  description: 'Find website development, digital marketing, sales systems, Google Maps setup, IT support, and cycling services from local organizations.',
};

export default function ServicesPage() {
  return <ServicesDirectory />;
}
