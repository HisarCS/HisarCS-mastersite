import { describe, it, expect } from 'vitest';
import { initials, PALETTE, paletteColor } from '../../lib/util/palette';

describe('paletteColor', () => {
  it('is stable per key and always a palette color', () => {
    expect(paletteColor('Robotics')).toBe(paletteColor('Robotics'));
    for (const k of ['', 'a', 'Robotics', 'IDC', 'ÇĞİ']) expect(PALETTE).toContain(paletteColor(k));
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words, upper-cased', () => {
    expect(initials('otto markdown replica')).toBe('OM');
    expect(initials('  Ada  ')).toBe('A');
  });
  it('falls back to "?" for blank input', () => {
    expect(initials('')).toBe('?');
  });
});
