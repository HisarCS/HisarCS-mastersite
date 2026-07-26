import { describe, it, expect } from 'vitest';
import { normalizeHandle, handlesMatch } from '../../lib/util/handle';

describe('normalizeHandle', () => {
  it('trims, drops leading @(s), lowercases', () => {
    expect(normalizeHandle('  @@Octocat  ')).toBe('octocat');
    expect(normalizeHandle('KMert10')).toBe('kmert10');
  });

  it('handles null/undefined/empty', () => {
    expect(normalizeHandle(null)).toBe('');
    expect(normalizeHandle(undefined)).toBe('');
    expect(normalizeHandle('   ')).toBe('');
  });

  it('uses plain (non-Turkish) lowercasing so "Ipek" stays "ipek"', () => {
    // Turkish-locale toLowerCase would map "I" → "ı" and break the match.
    expect(normalizeHandle('Ipek')).toBe('ipek');
    expect(normalizeHandle('IPEK')).toBe('ipek');
  });
});

describe('handlesMatch', () => {
  it('matches case-insensitively and tolerates @ / whitespace', () => {
    expect(handlesMatch('@Octocat', 'octocat')).toBe(true);
    expect(handlesMatch('  octocat ', 'Octocat')).toBe(true);
    expect(handlesMatch('Ipek', 'ipek')).toBe(true);
  });

  it('rejects mismatches', () => {
    expect(handlesMatch('someoneelse', 'octocat')).toBe(false);
    expect(handlesMatch('octocatx', 'octocat')).toBe(false);
  });

  it('never matches when either side is empty', () => {
    expect(handlesMatch('', 'octocat')).toBe(false);
    expect(handlesMatch('octocat', '')).toBe(false);
    expect(handlesMatch('@', 'octocat')).toBe(false);
  });
});
