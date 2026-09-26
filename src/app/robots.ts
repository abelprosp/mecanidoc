import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mecanidoc.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/checkout', '/auth/', '/product$'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
