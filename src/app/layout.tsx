import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

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
        <nav className="bg-green-800 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold">
                🚵 MTB Trails
              </Link>
              <div className="flex gap-6">
                <Link
                  href="/trails"
                  className="hover:text-green-200 transition-colors"
                >
                  Search Trails
                </Link>
                <Link
                  href="/events"
                  className="hover:text-green-200 transition-colors"
                >
                  Events
                </Link>
                <Link
                  href="/events/create"
                  className="hover:text-green-200 transition-colors"
                >
                  Create Event
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

