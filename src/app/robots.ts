import type { MetadataRoute } from 'next';
import { getPublicAppUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const base = getPublicAppUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/login',
          '/exchange_token',
          '/participants/me',
          '/experts/me',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

