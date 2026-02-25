
import type { Metadata, Viewport } from 'next';

import Navbar from '@/components/navigation/navbar';
import PWARegister from '@/components/pwa-register';

import './globals.css';
import MainContent from '@/components/main-content';

export const metadata: Metadata = {
  title: 'MTB Trail Finder',
  description: 'Find mountain biking trails and join events',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Local Guides',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#166534',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('mtb_theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = (stored === 'dark' || stored === 'light') ? stored : (systemDark ? 'dark' : 'light');
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <PWARegister />
        <MainContent>
          <Navbar />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </MainContent>
      </body>
    </html>
  );
}
