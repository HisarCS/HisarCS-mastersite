import { describe, it, expect } from 'vitest';
import { INTEREST_AREAS, interestAreasOf, tableFromRows } from '../../lib/domain/interests';

describe('interestAreasOf', () => {
  it('folds near-duplicate tags into one area (Otto and Parametrix meet)', () => {
    expect(interestAreasOf(['Parametric CAD'])).toEqual(['Parametric Design']);
    expect(interestAreasOf(['Parametric Design', 'LLM'])).toEqual(['Parametric Design', 'AI']);
  });

  it('matches case-insensitively and dedupes', () => {
    expect(interestAreasOf(['robotics', 'Biomimetic Robots', 'ROBOTICS'])).toEqual(['Robotics']);
  });

  it('a tag can sit in more than one area', () => {
    expect(interestAreasOf(['AI Literacy'])).toEqual(['AI', 'Learning']);
  });

  it('keeps a tag nobody mapped yet, so new member tags still show up', () => {
    expect(interestAreasOf(['Ceramics', 'Laser Cutting'])).toEqual([
      'Ceramics',
      'Digital Fabrication',
    ]);
  });

  it('is empty for no tags', () => {
    expect(interestAreasOf([])).toEqual([]);
  });

  it('the table lists tags in lower case (lookups are case-insensitive)', () => {
    for (const [, tags] of Object.entries(INTEREST_AREAS))
      for (const t of tags) expect(t).toBe(t.toLowerCase());
  });
});

describe('interestAreasOf with a table from the database', () => {
  const table = { Making: ['laser cutting', 'robotics'], 'Robots & AI': ['robotics', 'ai'] };

  it('uses the given table instead of the built-in one', () => {
    expect(interestAreasOf(['Laser Cutting'], table)).toEqual(['Making']);
    expect(interestAreasOf(['robotics'], table)).toEqual(['Making', 'Robots & AI']);
    expect(interestAreasOf(['Parametric CAD'], table)).toEqual(['Parametric CAD']); // unfiled here
  });
});

describe('tableFromRows', () => {
  it('groups rows by area, areas ordered by sort then name', () => {
    expect(
      tableFromRows([
        { area: 'B', tag: 'x', sort: 1 },
        { area: 'A', tag: 'y', sort: 0 },
        { area: 'B', tag: 'z', sort: 1 },
        { area: 'C', tag: 'w', sort: 0 },
      ]),
    ).toEqual({ A: ['y'], C: ['w'], B: ['x', 'z'] });
  });

  it('keeps Object key order = display order', () => {
    expect(
      Object.keys(
        tableFromRows([
          { area: 'Z', tag: 'a', sort: 0 },
          { area: 'A', tag: 'b', sort: 5 },
        ]),
      ),
    ).toEqual(['Z', 'A']);
  });

  it('is empty for no rows', () => {
    expect(tableFromRows([])).toEqual({});
  });
});
