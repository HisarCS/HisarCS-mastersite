import { researchFileUrl } from '@/lib/data/researchEntries';
import { resolveMediaSrc } from '@/lib/util/media';

/** An image src from a research page's markdown → the URL to load (site
 *  asset, uploaded file, or sanitized https). Shared by the renderer and
 *  the fences that show images. */
export const mediaUrl = (src: string) =>
  resolveMediaSrc(src, process.env.NEXT_PUBLIC_BASE_PATH ?? '', researchFileUrl);
