/**
 * Parsers for the two custom markdown fences on research pages. Pure and
 * tested — the components only draw what these return.
 *
 * ```chart                            ```stats
 * type: bar            (bar | line)   €4.10 | per panel
 * question: Does it match foam?       14 | days grow time
 * x: 250 Hz, 1 kHz, 2 kHz
 * Panel: 0.31, 0.55, 0.68             (one `value | label` per line)
 * Foam: 0.42, 0.61, 0.72
 * ```
 *
 * In a chart, every non-reserved `Name: v1, v2, …` line is a data series.
 * `question` is required — a chart must say what it answers (it becomes the
 * caption).
 */

export interface ChartSpec {
  type: 'bar' | 'line';
  question: string;
  x: string[];
  series: { name: string; values: number[] }[];
}

export type ParseResult<T> = { ok: T; error?: never } | { ok?: never; error: string };

const RESERVED = new Set(['type', 'question', 'x']);

export function parseChartSpec(text: string): ParseResult<ChartSpec> {
  let type: 'bar' | 'line' = 'bar';
  let question = '';
  let x: string[] = [];
  const series: ChartSpec['series'] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 1) return { error: `every line needs "name: values" — got "${line}"` };
    const key = line.slice(0, i).trim();
    const rest = line.slice(i + 1).trim();
    const lower = key.toLowerCase();

    if (lower === 'type') {
      if (rest !== 'bar' && rest !== 'line')
        return { error: `type must be bar or line, not "${rest}"` };
      type = rest;
    } else if (lower === 'question') {
      question = rest;
    } else if (lower === 'x') {
      x = rest
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      const values = rest.split(',').map((s) => Number(s.trim()));
      if (values.length === 0 || values.some((v) => !Number.isFinite(v)))
        return { error: `series "${key}" has a non-numeric value` };
      series.push({ name: key, values });
    }
  }

  if (!question) return { error: 'add a "question:" line — a chart must say what it answers' };
  if (x.length === 0) return { error: 'add an "x:" line with the category labels' };
  if (series.length === 0) return { error: 'add at least one data series ("Name: 1, 2, 3")' };
  for (const s of series) {
    if (s.values.length !== x.length)
      return { error: `series "${s.name}" has ${s.values.length} values but x has ${x.length}` };
  }
  if (series.some((s) => RESERVED.has(s.name.toLowerCase())))
    return { error: 'series names cannot be "type", "question" or "x"' };
  return { ok: { type, question, x, series } };
}

export interface StatsSpec {
  items: { value: string; label: string }[];
}

export function parseStatsSpec(text: string): ParseResult<StatsSpec> {
  const items: StatsSpec['items'] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const i = line.indexOf('|');
    if (i < 1 || i === line.length - 1)
      return { error: `every line needs "value | label" — got "${line}"` };
    items.push({ value: line.slice(0, i).trim(), label: line.slice(i + 1).trim() });
  }
  if (items.length === 0) return { error: 'add at least one "value | label" line' };
  return { ok: { items } };
}

/** Image placement parsed from the markdown title string:
 *  ![Caption](src "left 40") → { align: 'left', width: 40 }. */
export interface Placement {
  align: 'full' | 'wide' | 'inset' | 'left' | 'right';
  width?: number; // percent, floats only
}

export function parsePlacement(title: string | undefined): Placement {
  if (!title) return { align: 'full' };
  const m = title.trim().match(/^(full|wide|inset|left|right)(?:\s+(\d{2}))?$/i);
  if (!m) return { align: 'full' };
  const align = m[1]!.toLowerCase() as Placement['align'];
  const width = m[2] ? Math.min(60, Math.max(25, Number(m[2]))) : undefined;
  return align === 'left' || align === 'right' ? { align, width: width ?? 40 } : { align };
}
