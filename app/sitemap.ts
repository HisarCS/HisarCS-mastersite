import type { MetadataRoute } from 'next';
import { listShareCards } from '@/lib/data/shareable';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-static';

/** Static pages + one share page per research entry (they carry the
 *  entry's title and summary in plain HTML, which search engines can read). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['/', '/research/', '/members/', '/about/'].map((p) => ({ url: siteUrl(p) }));
  const shares = (await listShareCards()).map((c) => ({ url: siteUrl(`/r/${c.slug}/`) }));
  return [...pages, ...shares];
}
