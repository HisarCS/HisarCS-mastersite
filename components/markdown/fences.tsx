'use client';

import type { ReactNode } from 'react';
import { parseChartSpec, parseStatsSpec, type ParseResult } from '@/lib/util/chartSpec';
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
};

/** The fence for a code-block language, or undefined for ordinary code. */
export function fenceFor(lang: string): FenceDef<unknown> | undefined {
  return Object.hasOwn(FENCES, lang) ? FENCES[lang] : undefined;
}
