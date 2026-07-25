import { describe, it, expect } from 'vitest';
import { cleanYearInput, isValidGradYear, gradYearMax, GRAD_YEAR_MIN } from '../../lib/util/year';
import { diffFieldIds } from '../../lib/domain/fields';

describe('graduation year', () => {
  const now = new Date('2026-01-01');
  it('cleans input to at most 4 digits', () => {
    expect(cleanYearInput('20a2b8')).toBe('2028');
    expect(cleanYearInput('202899')).toBe('2028');
    expect(cleanYearInput('')).toBe('');
  });
  it('accepts years in range and rejects out-of-range', () => {
    expect(isValidGradYear(2028, now)).toBe(true);
    expect(isValidGradYear(GRAD_YEAR_MIN, now)).toBe(true);
    expect(isValidGradYear(gradYearMax(now), now)).toBe(true);
    expect(isValidGradYear(2000, now)).toBe(false); // before min
    expect(isValidGradYear(gradYearMax(now) + 1, now)).toBe(false); // after max
  });
});

describe('diffFieldIds', () => {
  it('computes adds and removes', () => {
    expect(diffFieldIds([1, 2, 3], [2, 3, 4])).toEqual({ toAdd: [4], toRemove: [1] });
  });
  it('is empty when unchanged', () => {
    expect(diffFieldIds([1, 2], [2, 1])).toEqual({ toAdd: [], toRemove: [] });
  });
  it('handles first-time selection (nothing before)', () => {
    expect(diffFieldIds([], [5, 6])).toEqual({ toAdd: [5, 6], toRemove: [] });
  });
});
