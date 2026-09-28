import { describe, it, expect } from 'vitest';
import { shareCards } from '../../lib/data/shareable';
import { RESEARCH_ITEMS } from '../../lib/data/research';

const row = (over: Record<string, unknown> = {}) => ({
  public_id: 'otto-markdown-replica',
  title: 'Otto - Markdown Replica',
  description: 'A replica.',
  avatar_url: 'https://x.supabase.co/storage/v1/object/public/research-files/a/hero.jpg',
  venue: null,
  ...over,
});

describe('shareCards', () => {
  it('every curated write-up gets one, with its summary and thumbnail', () => {
    const cards = shareCards([]);
    expect(cards.map((c) => c.slug)).toEqual(RESEARCH_ITEMS.map((r) => r.slug));
    const otto = cards.find((c) => c.slug === 'otto')!;
    expect(otto.title).toBe('Otto');
    expect(otto.description).toMatch(/parametric CAD/);
    expect(otto.image).toMatch(/\/research\/thumb\/otto\.jpg$/);
    expect(otto.subtitle).toBe("SCF Adjunct '25");
  });

  it('adds published member entries after them; curated wins a slug clash', () => {
    const cards = shareCards([row(), row({ public_id: 'otto', title: 'Impostor' })]);
    expect(cards.at(-1)!.slug).toBe('otto-markdown-replica');
    expect(cards.filter((c) => c.slug === 'otto')).toHaveLength(1);
    expect(cards.find((c) => c.slug === 'otto')!.title).toBe('Otto');
  });

  it('member entries without a description or image still get a card', () => {
    const c = shareCards([row({ description: '', avatar_url: null })]).at(-1)!;
    expect(c.description).toBe('Research from Hisar School ideaLab.');
    expect(c.image).toBeNull();
  });

  it('drops rows with unusable slugs rather than building a broken page', () => {
    const cards = shareCards([row({ public_id: '../etc' }), row({ public_id: '' })]);
    expect(cards).toHaveLength(RESEARCH_ITEMS.length);
  });
});
