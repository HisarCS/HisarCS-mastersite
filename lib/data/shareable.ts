import { supabaseConfig } from '../env';
import { RESEARCH_ITEMS, researchPageUrl } from './research';

/**
 * Share pages (/r/<slug>/) — one static page per research entry carrying its
 * link-preview tags, because the real page (/research?id=<slug>) is one
 * client-rendered file that link-preview bots see as generic. Built at build
 * time; see app/r/[slug]/page.tsx and ADR-0021.
 */

export interface ShareCard {
  slug: string;
  title: string;
  /** venue line under the title */
  subtitle: string | null;
  description: string;
  /** absolute URL, or a basePath-prefixed site path; null = no image */
  image: string | null;
}

/** a published `research` row, as read at build time */
export interface ShareRow {
  public_id: string;
  title: string;
  description: string | null;
  avatar_url: string | null;
  venue: string | null;
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** Curated write-ups first, then published member entries (curated wins a
 *  slug clash; unusable slugs are dropped). Pure. */
export function shareCards(rows: ShareRow[]): ShareCard[] {
  const curated: ShareCard[] = RESEARCH_ITEMS.map((r) => ({
    slug: r.slug,
    title: r.title,
    subtitle: r.venue ?? null,
    description: r.summary,
    image: r.thumb ?? null,
  }));
  const taken = new Set(curated.map((c) => c.slug));
  const members = rows
    .filter((r) => SLUG.test(r.public_id) && !taken.has(r.public_id))
    .map((r) => ({
      slug: r.public_id,
      title: r.title,
      subtitle: r.venue,
      description: r.description?.trim() || 'Research from Hisar School ideaLab.',
      image: r.avatar_url,
    }));
  return [...curated, ...members];
}

/**
 * Everything that gets a share page. Member entries are included only when
 * SHARE_PAGES_FROM_DB=1 (the deploy build): they're read from production with
 * the public anon key at build time, so local and test builds stay offline.
 */
export async function listShareCards(): Promise<ShareCard[]> {
  if (process.env.SHARE_PAGES_FROM_DB !== '1') return shareCards([]);
  const { url, anonKey } = supabaseConfig(); // no window at build → production
  const res = await fetch(
    `${url}/rest/v1/research?select=public_id,title,description,avatar_url,venue&is_published=eq.true`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
  );
  if (!res.ok) throw new Error(`share pages: reading published research failed (${res.status})`);
  return shareCards((await res.json()) as ShareRow[]);
}

/**
 * The best link to share for a research entry: its share page when one was
 * built (it previews nicely), else the page itself — entries published after
 * the last deploy don't have a share page until the next (nightly) build.
 */
export async function shareLinkFor(slug: string): Promise<string> {
  const share = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/r/${encodeURIComponent(slug)}/`;
  try {
    const res = await fetch(share, { method: 'HEAD' });
    if (res.ok) return share;
  } catch {
    // offline / blocked — fall through to the page link
  }
  return researchPageUrl(slug);
}
