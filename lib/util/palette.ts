import { hashStr } from './hash';

/** The site's fallback/category colors — accent first. */
export const PALETTE = ['#e8542f', '#2f6fe8', '#28a06d', '#c4a11f', '#9048c8', '#d2447e'];

/** A stable palette color for any key (a tag keeps its color on every page). */
export const paletteColor = (key: string) => PALETTE[hashStr(key) % PALETTE.length]!;

/** "Otto Markdown Replica" → "OM"; blank → "?". */
export const initials = (s: string) =>
  (s || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
