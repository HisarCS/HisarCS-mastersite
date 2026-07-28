/**
 * Research pages are Markdown documents stored in `research.page` jsonb as
 * { version: 2, markdown: string }. Null = no composed page; the public view
 * falls back to `description`.
 *
 * The markdown dialect (rendered by components/markdown/MarkdownPage):
 * - GitHub-flavored markdown (headings, tables, task lists, strikethrough)
 * - math: $inline$ and $$block$$ (KaTeX)
 * - fenced charts: ```chart and ```stats (see lib/util/chartSpec.ts)
 * - images: ![Caption](src "placement") — src is an uploaded-file storage path
 *   or an https URL; placement is left|right|inset|wide, optionally with a
 *   width percentage ("left 40"). Adjacent images in one paragraph render side
 *   by side. Raw HTML is never rendered.
 *
 * v1 (the retired block format) is not converted: normalizePage returns null
 * for it, so such entries render their description until re-authored. The
 * stored jsonb is only overwritten on the next explicit save.
 */

export const PAGE_VERSION = 2;

export interface ResearchPage {
  version: number;
  markdown: string;
}

/** Parse whatever is stored into a usable page, or null. */
export function normalizePage(raw: unknown): ResearchPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { version?: unknown; markdown?: unknown };
  if (typeof o.markdown !== 'string' || !o.markdown.trim()) return null;
  return {
    version: typeof o.version === 'number' ? o.version : PAGE_VERSION,
    markdown: o.markdown,
  };
}
