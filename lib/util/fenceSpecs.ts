import type { ParseResult } from './chartSpec';

/**
 * Parsers for the media fences on research pages (```video, …). Pure and
 * tested — the components only draw what these return.
 */

export interface VideoSpec {
  provider: 'youtube' | 'vimeo';
  /** privacy-mode embed URL (youtube-nocookie / Vimeo do-not-track) */
  embed: string;
  caption: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

/**
 * ```video
 * https://youtu.be/<id>          ← YouTube or Vimeo only, https
 * Optional caption (any lines)
 * ```
 */
export function parseVideoSpec(text: string): ParseResult<VideoSpec> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { error: 'add a YouTube or Vimeo link' };
  let url: URL;
  try {
    url = new URL(lines[0]!);
  } catch {
    return { error: `the first line must be a YouTube or Vimeo link — got "${lines[0]}"` };
  }
  if (url.protocol !== 'https:') return { error: 'use the https:// link' };
  const host = url.hostname.replace(/^(www|m)\./, '');
  const caption = lines.slice(1).join(' ');

  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const id =
      host === 'youtu.be'
        ? parts[0]
        : parts[0] === 'watch'
          ? url.searchParams.get('v')
          : parts[0] === 'shorts' || parts[0] === 'embed'
            ? parts[1]
            : null;
    if (!id || !YT_ID.test(id)) return { error: `couldn't find the video id in "${lines[0]}"` };
    return {
      ok: { provider: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${id}`, caption },
    };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).at(-1);
    if (!id || !VIMEO_ID.test(id)) return { error: `couldn't find the video id in "${lines[0]}"` };
    return {
      ok: { provider: 'vimeo', embed: `https://player.vimeo.com/video/${id}?dnt=1`, caption },
    };
  }
  return { error: `only YouTube or Vimeo links can be embedded — got ${url.hostname}` };
}
