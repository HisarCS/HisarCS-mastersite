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

export interface TimelineSpec {
  items: { date: string; text: string }[];
}

/**
 * ```timeline
 * Sep 2024 | First prototype, a single rotating drum
 * 2025 | Redesigned after five classroom cohorts
 * ```
 */
export function parseTimelineSpec(text: string): ParseResult<TimelineSpec> {
  const items: TimelineSpec['items'] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const i = line.indexOf('|');
    const date = i > 0 ? line.slice(0, i).trim() : '';
    const rest = i > 0 ? line.slice(i + 1).trim() : '';
    if (!date || !rest) return { error: `every line needs "date | milestone" — got "${line}"` };
    items.push({ date, text: rest });
  }
  if (!items.length) return { error: 'add at least one "date | milestone" line' };
  return { ok: { items } };
}

export interface CompareSpec {
  before: { src: string; caption: string };
  after: { src: string; caption: string };
}

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

/**
 * ```compare
 * ![Before: a single rotating drum](path/one-w2400.jpg)
 * ![After: two independent wheels](path/two-w2400.jpg)
 * ```
 */
export function parseCompareSpec(text: string): ParseResult<CompareSpec> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const imgs = [];
  for (const line of lines) {
    const m = line.match(IMAGE_LINE);
    if (!m) return { error: `every line must be an image, ![caption](image) — got "${line}"` };
    imgs.push({ src: m[2]!, caption: m[1]! });
  }
  if (imgs.length !== 2)
    return { error: `add exactly two images (before, after) — got ${imgs.length}` };
  return { ok: { before: imgs[0]!, after: imgs[1]! } };
}
