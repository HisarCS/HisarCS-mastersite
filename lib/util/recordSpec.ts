import type { ParseResult } from './chartSpec';

/**
 * The shared grammar for fences that hold a list of titled entries
 * (```findings, ```cards). Pure and tested — the components only draw what these
 * return.
 *
 * ```cards
 * # 01 — Text | Type the parameters     ← "# " starts an entry; "label |" optional
 * Write shapes, params, and …           ← body lines, joined into one paragraph
 * > param tabLength 30                  ← "> " lines: a verbatim snippet
 * > shape polygon hex {                   (indentation after "> " is kept)
 * >   sides: 6
 * > }
 * ```
 */

export interface RecordSpec {
  label?: string;
  title: string;
  body: string;
  code?: string;
}

export function parseRecords(text: string): ParseResult<RecordSpec[]> {
  const records: RecordSpec[] = [];
  const bodies: string[][] = [];
  const codes: string[][] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('>')) {
      if (records.length === 0) return { error: `start with "# Title" — got "${line}"` };
      // drop the marker and one space; keep the rest of the indentation
      codes[codes.length - 1]!.push(raw.trimStart().slice(1).replace(/^ /, '').trimEnd());
      continue;
    }
    if (line === '#' || line.startsWith('# ')) {
      const head = line.slice(1).trim();
      const bar = head.indexOf('|');
      const label = bar >= 0 ? head.slice(0, bar).trim() : undefined;
      const title = bar >= 0 ? head.slice(bar + 1).trim() : head;
      if (!title) return { error: `every "# " line needs a title — got "${line}"` };
      records.push(label ? { label, title, body: '' } : { title, body: '' });
      bodies.push([]);
      codes.push([]);
      continue;
    }
    if (records.length === 0) return { error: `start with "# Title" — got "${line}"` };
    bodies[bodies.length - 1]!.push(line);
  }

  if (records.length === 0) return { error: 'add at least one "# Title" line' };
  records.forEach((r, i) => {
    r.body = bodies[i]!.join(' ');
    if (codes[i]!.length) r.code = codes[i]!.join('\n');
  });
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
    if (rec.code !== undefined)
      return { error: `findings have no snippets — "> " lines belong in a cards fence` };
    const tone = (rec.label ?? 'good').toLowerCase();
    if (!(FINDING_TONES as readonly string[]).includes(tone))
      return { error: `tone must be good, note or issue — not "${rec.label}"` };
    items.push({ tone: tone as FindingTone, title: rec.title, body: rec.body });
  }
  return { ok: { items } };
}

export interface CardsSpec {
  items: RecordSpec[];
}

/** Side-by-side cards: optional eyebrow label, title, body, optional snippet. */
export function parseCardsSpec(text: string): ParseResult<CardsSpec> {
  const r = parseRecords(text);
  if (r.error !== undefined) return r;
  return { ok: { items: r.ok } };
}
