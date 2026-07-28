import { describe, it, expect } from 'vitest';
import { normalizePage, PAGE_VERSION } from '../../lib/domain/page';
import { parseChartSpec, parsePlacement, parseStatsSpec } from '../../lib/util/chartSpec';

describe('normalizePage (v2: markdown)', () => {
  it('rejects null, non-objects, and empty documents', () => {
    expect(normalizePage(null)).toBeNull();
    expect(normalizePage('x')).toBeNull();
    expect(normalizePage({})).toBeNull();
    expect(normalizePage({ markdown: '   ' })).toBeNull();
  });

  it('rejects the retired v1 block shape (falls back to description)', () => {
    expect(normalizePage({ version: 1, blocks: [{ type: 'text', data: { md: 'x' } }] })).toBeNull();
  });

  it('accepts a markdown document and defaults the version', () => {
    const p = normalizePage({ markdown: '# hi' });
    expect(p).toEqual({ version: PAGE_VERSION, markdown: '# hi' });
  });
});

describe('parseChartSpec', () => {
  const good = `type: bar
question: Does it match foam?
x: 250 Hz, 1 kHz
Panel: 0.31, 0.55
Foam: 0.42, 0.61`;

  it('parses type, question, x, and series', () => {
    const r = parseChartSpec(good);
    expect(r.error).toBeUndefined();
    expect(r.ok!.type).toBe('bar');
    expect(r.ok!.x).toEqual(['250 Hz', '1 kHz']);
    expect(r.ok!.series).toEqual([
      { name: 'Panel', values: [0.31, 0.55] },
      { name: 'Foam', values: [0.42, 0.61] },
    ]);
  });

  it('requires a question — a chart must say what it answers', () => {
    expect(parseChartSpec('x: a\nS: 1').error).toMatch(/question/);
  });

  it('rejects series/x length mismatches and non-numeric values', () => {
    expect(parseChartSpec('question: q\nx: a, b\nS: 1').error).toMatch(/2/);
    expect(parseChartSpec('question: q\nx: a\nS: one').error).toMatch(/non-numeric/);
  });

  it('rejects unknown chart types', () => {
    expect(parseChartSpec('type: pie\nquestion: q\nx: a\nS: 1').error).toMatch(/bar or line/);
  });
});

describe('parseStatsSpec', () => {
  it('parses value | label lines', () => {
    const r = parseStatsSpec('€4.10 | per panel\n14 | days');
    expect(r.ok!.items).toEqual([
      { value: '€4.10', label: 'per panel' },
      { value: '14', label: 'days' },
    ]);
  });

  it('rejects lines without the separator', () => {
    expect(parseStatsSpec('just some text').error).toMatch(/value \| label/);
  });
});

describe('parsePlacement', () => {
  it('defaults to full, and on unknown strings', () => {
    expect(parsePlacement(undefined)).toEqual({ align: 'full' });
    expect(parsePlacement('sideways')).toEqual({ align: 'full' });
  });

  it('parses floats with a default and clamped width', () => {
    expect(parsePlacement('left')).toEqual({ align: 'left', width: 40 });
    expect(parsePlacement('right 55')).toEqual({ align: 'right', width: 55 });
    expect(parsePlacement('left 99')).toEqual({ align: 'left', width: 60 }); // clamped
  });

  it('parses non-float alignments without width', () => {
    expect(parsePlacement('inset')).toEqual({ align: 'inset' });
    expect(parsePlacement('wide')).toEqual({ align: 'wide' });
  });
});
