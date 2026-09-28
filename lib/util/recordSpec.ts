import type { ParseResult } from './chartSpec';

/**
 * The shared grammar for fences that hold a list of titled entries
 * (```findings, …). Pure and tested — the components only draw what these
 * return.
 *
 * ```findings
 * # Live feedback made the abstract legible     ← "# " starts an entry
 * The Constraints and Parameters menus …        ← body lines, joined
 *
 * # issue | Canvas responsiveness was the rough edge
 * Participants noticed lag …                    ← "label |" is optional
 * ```
 */

export interface RecordSpec {
  label?: string;
  title: string;
  body: string;
}

export function parseRecords(text: string): ParseResult<RecordSpec[]> {
  const records: RecordSpec[] = [];
  const bodies: string[][] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line === '#' || line.startsWith('# ')) {
      const head = line.slice(1).trim();
      const bar = head.indexOf('|');
      const label = bar >= 0 ? head.slice(0, bar).trim() : undefined;
      const title = bar >= 0 ? head.slice(bar + 1).trim() : head;
      if (!title) return { error: `every "# " line needs a title — got "${line}"` };
      records.push(label ? { label, title, body: '' } : { title, body: '' });
      bodies.push([]);
      continue;
    }
    if (records.length === 0) return { error: `start with "# Title" — got "${line}"` };
    bodies[bodies.length - 1]!.push(line);
  }

  if (records.length === 0) return { error: 'add at least one "# Title" line' };
  records.forEach((r, i) => (r.body = bodies[i]!.join(' ')));
  return { ok: records };
}

export const FINDING_TONES = ['good', 'note', 'issue'] as const;
export type FindingTone = (typeof FINDING_TONES)[number];

export interface FindingsSpec {
  items: { tone: FindingTone; title: string; body: string }[];
}

/** Entries whose optional label is a tone: good (default) · note · issue. */
export function parseFindingsSpec(text: string): ParseResult<FindingsSpec> {
  const r = parseRecords(text);
  if (r.error !== undefined) return r;
  const items: FindingsSpec['items'] = [];
  for (const rec of r.ok) {
    const tone = (rec.label ?? 'good').toLowerCase();
    if (!(FINDING_TONES as readonly string[]).includes(tone))
      return { error: `tone must be good, note or issue — not "${rec.label}"` };
    items.push({ tone: tone as FindingTone, title: rec.title, body: rec.body });
  }
  return { ok: { items } };
}
