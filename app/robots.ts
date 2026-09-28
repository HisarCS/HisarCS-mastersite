import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // the sign-in / editing area has nothing to index
    rules: { userAgent: '*', allow: '/', disallow: ['/member/', '/research/edit/', '/admin/'] },
    sitemap: siteUrl('/sitemap.xml'),
  };
}
