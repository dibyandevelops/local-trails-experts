import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/navigation/navbar';

export const metadata: Metadata = {
  title: 'MTB Trail Finder',
  description: 'Find mountain biking trails and join events',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
