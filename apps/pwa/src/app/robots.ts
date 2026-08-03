import type { MetadataRoute } from 'next';

// Serves /robots.txt — the whole app is closed to crawlers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
