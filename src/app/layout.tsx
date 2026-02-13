
import type { Metadata } from 'next';

import Navbar from '@/components/navigation/navbar';

import './globals.css';
import MainContent from '@/components/main-content';

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
        <main className="container mx-auto px-4 py-8">
          <MainContent>{children}</MainContent>
        </main>
      </body>
    </html>
  );
}

