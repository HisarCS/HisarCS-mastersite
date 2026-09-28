/**
 * Where the site is published — for absolute URLs in link previews, the
 * sitemap, and robots.txt. The origin is fixed; the sub-path comes from the
 * same NEXT_PUBLIC_BASE_PATH as everything else (next.config.mjs), so a move
 * to a root domain means changing SITE_ORIGIN and clearing that env var.
 */
export const SITE_ORIGIN = 'https://hisarcs.github.io';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
/** absolute URL of a site path ("/research/" → https://…/HisarCS-mastersite/research/) */
export const siteUrl = (path: string) => `${SITE_ORIGIN}${BASE_PATH}${path}`;

export const SITE_NAME = 'ideaLab';
export const SITE_DESCRIPTION =
  'Hisar School ideaLab — students and alumni building research in parametric design, robotics, AI, and HCI.';
