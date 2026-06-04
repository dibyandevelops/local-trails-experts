import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const iconVersion = '20260604-pwa-safe-area';

  return {
    name: 'LocoXperts',
    short_name: 'LocoXperts',
    description: 'Find mountain trails, join events, and connect with verified local experts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: `/icons/icon-192x192.png?v=${iconVersion}`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `/icons/icon-512x512.png?v=${iconVersion}`,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: `/icons/maskable-icon-192x192.png?v=${iconVersion}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `/icons/maskable-icon-512x512.png?v=${iconVersion}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
