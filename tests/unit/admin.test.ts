import { describe, it, expect } from 'vitest';
import {
  adminRemovalBlocker,
  normalizeArea,
  normalizeGithubLogin,
  normalizeTag,
} from '../../lib/domain/admin';

describe('normalizeGithubLogin', () => {
  it('trims, drops a leading @, lower-cases', () => {
    expect(normalizeGithubLogin('  @KMert10 ')).toEqual({ ok: 'kmert10' });
  });

  it('refuses what GitHub itself would', () => {
    expect(normalizeGithubLogin('').error).toMatch(/GitHub username/);
    expect(normalizeGithubLogin('-leading-dash').error).toMatch(/GitHub username/);
    expect(normalizeGithubLogin('has space').error).toMatch(/GitHub username/);
    expect(normalizeGithubLogin('a'.repeat(40)).error).toMatch(/GitHub username/);
  });
});

describe('adminRemovalBlocker', () => {
  const admins = ['kmert10', 'dayangac'];

  it('allows removing someone else while another admin remains', () => {
    expect(adminRemovalBlocker('kmert10', 'dayangac', admins)).toBeNull();
  });

  it('never lets you remove yourself (no locking yourself out mid-edit)', () => {
    expect(adminRemovalBlocker('dayangac', 'dayangac', admins)).toMatch(/yourself/);
    expect(adminRemovalBlocker('DayAngac', 'dayangac', admins)).toMatch(/yourself/);
  });

  it('never removes the last admin', () => {
    expect(adminRemovalBlocker('kmert10', 'someone', ['kmert10'])).toMatch(/last admin/);
  });
});

describe('normalizeTag / normalizeArea', () => {
  it('tags: trimmed, single-spaced, lower case', () => {
    expect(normalizeTag('  Laser   Cutting ')).toEqual({ ok: 'laser cutting' });
  });

  it('areas keep their casing', () => {
    expect(normalizeArea('  HCI  &  AR ')).toEqual({ ok: 'HCI & AR' });
  });

  it('both refuse empty and over-long names', () => {
    expect(normalizeTag('   ').error).toMatch(/name/);
    expect(normalizeArea('x'.repeat(61)).error).toMatch(/60/);
  });
});
