/**
 * Block-based research pages. A page is an ordered list of content blocks;
 * style comes from the site, authors choose content and order. Stored whole in
 * `research.page` jsonb — see docs/research-publishing-framework.md.
 *
 * Evolution rules (keep these or old content breaks):
 * - Renderers/editors SKIP unknown types/variants but PRESERVE them on save.
 * - Prefer a new variant over a new type; new type only for a new data shape.
 * - PAGE_VERSION bumps only on breaking shape changes, with a read-time
 *   migration in `normalizePage`.
 */

export const PAGE_VERSION = 1;

export interface TextBlock {
  type: 'text';
  variant?: 'lede';
  data: { heading?: string; md: string };
}

export interface MediaBlock {
  type: 'media';
  variant?: 'full' | 'inset';
  /** src: a research-files storage path, or an external https URL */
  data: { src: string; caption: string };
}

export interface GalleryBlock {
  type: 'gallery';
  variant?: 'grid' | 'pair' | 'sequence';
  data: { items: { src: string; caption: string }[] };
}

export interface NumbersBlock {
  type: 'numbers';
  variant?: 'chips' | 'tiles';
  data: { items: { value: string; label: string }[] };
}

export interface TableBlock {
  type: 'table';
  variant?: 'plain' | 'kv';
  data: { heading?: string; header: string[]; rows: string[][]; note?: string };
}

export interface ListBlock {
  type: 'list';
  variant?: 'bulleted' | 'numbered' | 'steps';
  data: { heading?: string; items: string[] };
}

export interface QuoteBlock {
  type: 'quote';
  data: { text: string; attribution?: string };
}

export interface CodeBlock {
  type: 'code';
  data: { language?: string; body: string };
}

export interface LinksBlock {
  type: 'links';
  variant?: 'row' | 'list';
  data: { items: { kind?: string; label: string; url: string }[] };
}

export type PageBlock =
  | TextBlock
  | MediaBlock
  | GalleryBlock
  | NumbersBlock
  | TableBlock
  | ListBlock
  | QuoteBlock
  | CodeBlock
  | LinksBlock;

export type BlockType = PageBlock['type'];

export interface ResearchPage {
  version: number;
  blocks: PageBlock[];
}

/** Parse whatever is stored into a usable page. Unknown blocks survive as-is
 *  (typed loosely) so a save round-trip never drops them. */
export function normalizePage(raw: unknown): ResearchPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { version?: unknown; blocks?: unknown };
  if (!Array.isArray(o.blocks)) return null;
  return {
    version: typeof o.version === 'number' ? o.version : PAGE_VERSION,
    blocks: o.blocks.filter(
      (b): b is PageBlock =>
        !!b && typeof b === 'object' && typeof (b as PageBlock).type === 'string',
    ),
  };
}

export function emptyPage(): ResearchPage {
  return { version: PAGE_VERSION, blocks: [] };
}
