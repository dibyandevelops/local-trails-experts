import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Guided Trails',
    short_name: 'Guided Trails',
    description: 'Find mountain trails, join events, and connect with verified local experts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#166534',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/maskable-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/tmp_pictures/Kapan-Monastery.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
