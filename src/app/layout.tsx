
import type { Metadata, Viewport } from 'next';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import Navbar from '@/components/navigation/navbar';
import Footer from '@/components/navigation/footer';
import PWARegister from '@/components/pwa-register';
import PushNotificationPrompt from '@/components/push-notification-prompt';
import { getServerCurrentUser } from '@/lib/auth-server';
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  getPublicAppUrl,
} from '@/lib/seo';

import './globals.css';
import MainContent from '@/components/main-content';

export const metadata: Metadata = {
  metadataBase: new URL(getPublicAppUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME,
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: ['/icons/icon-32x32.png'],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: absoluteUrl('/icons/icon-512x512.png') }],
  },
  twitter: {
    card: 'summary',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl('/icons/icon-512x512.png')],
  },
  verification: {
    google:
      (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
        process.env.GOOGLE_SITE_VERIFICATION ||
        '').trim() || undefined,
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getServerCurrentUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('mtb_theme');
                  // Default to light unless user explicitly chose dark.
                  var theme = (stored === 'dark' || stored === 'light') ? stored : 'light';
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <SpeedInsights />
        <Analytics />
        <PWARegister />
        <MainContent>
          <PushNotificationPrompt initialUser={initialUser} />
          <Navbar initialUser={initialUser} />
          <main className="container mx-auto flex-grow px-4 py-8">{children}</main>
          <Footer initialUser={initialUser} />
        </MainContent>
      </body>
    </html>
  );
}
