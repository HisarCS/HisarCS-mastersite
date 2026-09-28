import { describe, it, expect } from 'vitest';
import { parseFindingsSpec, parseRecords } from '../../lib/util/recordSpec';

describe('parseRecords', () => {
  it('splits on "# " headers and joins body lines into one paragraph', () => {
    const r = parseRecords('# First\nline one\nline two\n\n# Second\nbody');
    expect(r.ok).toEqual([
      { title: 'First', body: 'line one line two' },
      { title: 'Second', body: 'body' },
    ]);
  });

  it('reads an optional "label |" before the title', () => {
    expect(parseRecords('# 01 — Text | Type the parameters').ok).toEqual([
      { label: '01 — Text', title: 'Type the parameters', body: '' },
    ]);
  });

  it('keeps a "|" inside the title after the first one', () => {
    expect(parseRecords('# a | b | c').ok![0]).toMatchObject({ label: 'a', title: 'b | c' });
  });

  it('rejects text before the first header', () => {
    expect(parseRecords('orphan\n# Title').error).toMatch(/start with "# Title"/);
  });

  it('rejects an empty title and an empty fence', () => {
    expect(parseRecords('# ').error).toMatch(/title/);
    expect(parseRecords('# note |').error).toMatch(/title/);
    expect(parseRecords('\n  \n').error).toMatch(/at least one/);
  });
});

describe('parseFindingsSpec', () => {
  it('defaults the tone to good', () => {
    expect(parseFindingsSpec('# Live feedback helped\nbody').ok!.items[0]).toEqual({
      tone: 'good',
      title: 'Live feedback helped',
      body: 'body',
    });
  });

  it('accepts note and issue tones, case-insensitively', () => {
    const r = parseFindingsSpec('# Note | Per-student\n# ISSUE | Canvas lag');
    expect(r.ok!.items.map((f) => f.tone)).toEqual(['note', 'issue']);
  });

  it('rejects an unknown tone and names the allowed ones', () => {
    expect(parseFindingsSpec('# bad | x').error).toMatch(/good, note or issue/);
  });
});
