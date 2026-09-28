import { describe, it, expect } from 'vitest';
import { INTEREST_AREAS, interestAreasOf } from '../../lib/domain/interests';

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
