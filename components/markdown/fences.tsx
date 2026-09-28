'use client';

import type { ReactNode } from 'react';
import { parseChartSpec, parseStatsSpec, type ParseResult } from '@/lib/util/chartSpec';
import { parseCardsSpec, parseFindingsSpec } from '@/lib/util/recordSpec';
import { ChartSvg } from './ChartSvg';
import styles from './Markdown.module.css';

/**
 * The fence registry — every custom ```lang block a research page can use.
 *
 * One entry = one fence: a pure parser (lib/util, unit-tested), a renderer for
 * what it returns, and the editor's insert snippet + syntax-reference text.
 * MarkdownPage, the editor's insert buttons, and its syntax reference all read
 * this table, so adding a fence is adding an entry here — nothing else changes.
 */
export interface FenceDef<T> {
  /** insert-button label in the editor */
  label: string;
  parse: (text: string) => ParseResult<T>;
  render: (spec: T) => ReactNode;
  /** inserted at the cursor by the editor's button */
  snippet: string;
  /** annotated example for the editor's syntax reference */
  reference: string;
}

/** Keeps each entry's parse/render pair type-checked against one another,
 *  then erases T so entries of different shapes share one table. */
function defineFence<T>(def: FenceDef<T>): FenceDef<unknown> {
  return def as FenceDef<unknown>;
}

export const FENCES: Record<string, FenceDef<unknown>> = {
  chart: defineFence({
    label: 'Chart',
    parse: parseChartSpec,
    render: (spec) => (
      <figure className={`${styles.figure} ${styles.full}`}>
        <div className={styles.chartCard}>
          <ChartSvg spec={spec} />
        </div>
        <figcaption className={styles.caption}>
          <strong>{spec.question}</strong>
        </figcaption>
      </figure>
    ),
    snippet: `\`\`\`chart
type: bar
question: What does this chart answer?
x: A, B, C
Series 1: 1, 2, 3
\`\`\`
`,
    reference: `\`\`\`chart
type: bar            (or: line)
question: The one question this chart answers
x: 250 Hz, 1 kHz, 2 kHz
Panel: 0.31, 0.55, 0.68
Foam: 0.42, 0.61, 0.72
\`\`\``,
  }),

  stats: defineFence({
    label: 'Stats',
    parse: parseStatsSpec,
    render: (spec) => (
      <div className={styles.chips}>
        {spec.items.map((it, i) => (
          <span key={i} className={styles.chip}>
            <b>{it.value}</b> {it.label}
          </span>
        ))}
      </div>
    ),
    snippet: `\`\`\`stats
42 | what this number is
\`\`\`
`,
    reference: `\`\`\`stats
€4.10 | per panel
14 | days grow time
\`\`\``,
  }),

  tiles: defineFence({
    label: 'Tiles',
    parse: parseStatsSpec,
    render: (spec) => (
      <div className={styles.tiles} role="list">
        {spec.items.map((it, i) => (
          <div key={i} className={styles.tile} role="listitem">
            <div className={styles.tileValue}>{it.value}</div>
            <div className={styles.tileLabel}>{it.label}</div>
          </div>
        ))}
      </div>
    ),
    snippet: `\`\`\`tiles
10 | what this number is
\`\`\`
`,
    reference: `\`\`\`tiles              (same lines as stats, drawn as big-number tiles)
10 | students
15–20m | intro before building
10 / 10 | left with a fabrication-ready model
\`\`\``,
  }),

  findings: defineFence({
    label: 'Findings',
    parse: parseFindingsSpec,
    render: (spec) => (
      <ul className={styles.findings}>
        {spec.items.map((f, i) => (
          <li key={i} className={`${styles.finding} ${styles[f.tone] ?? ''}`}>
            <h4>{f.title}</h4>
            {f.body && <p>{f.body}</p>}
          </li>
        ))}
      </ul>
    ),
    snippet: `\`\`\`findings
# What you found
One or two sentences on why it matters.
\`\`\`
`,
    reference: `\`\`\`findings           (tone before "|": good · note · issue; default good)
# Live feedback made the abstract legible
Seeing a relationship update turned "trust the math" into something to watch.

# issue | Canvas responsiveness was the rough edge
Participants noticed lag during quick, successive edits.
\`\`\``,
  }),

  cards: defineFence({
    label: 'Cards',
    parse: parseCardsSpec,
    render: (spec) => (
      <div className={styles.cards} role="list">
        {spec.items.map((c, i) => (
          <div key={i} className={styles.card} role="listitem">
            {c.label && <div className={styles.cardLabel}>{c.label}</div>}
            <h4>{c.title}</h4>
            {c.body && <p>{c.body}</p>}
            {c.code && <pre className={styles.cardCode}>{c.code}</pre>}
          </div>
        ))}
      </div>
    ),
    snippet: `\`\`\`cards
# 01 — Label | Card title
What this card says.
> optional snippet line

# 02 — Label | Card title
What this card says.
\`\`\`
`,
    reference: `\`\`\`cards              (side by side; colors follow the order)
# 01 — Text | Type the parameters
Write shapes, params, and constraints directly.
> param tabLength 30          ("> " lines: a snippet, indentation kept)
> shape polygon hex {
>   sides: 6
> }

# 02 — Blocks | Snap together logic
The same language as draggable blocks.
\`\`\``,
  }),
};

/** The fence for a code-block language, or undefined for ordinary code. */
export function fenceFor(lang: string): FenceDef<unknown> | undefined {
  return Object.hasOwn(FENCES, lang) ? FENCES[lang] : undefined;
}
