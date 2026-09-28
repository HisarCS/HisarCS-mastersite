import { describe, it, expect } from 'vitest';
import { RESEARCH_ITEMS } from '../../lib/data/research';

describe('curated research data', () => {
  it('every write-up has authors and a citation', () => {
    for (const r of RESEARCH_ITEMS) {
      expect(r.authors.length, r.slug).toBeGreaterThan(0);
      expect(r.citation?.title, r.slug).toBeTruthy();
      expect(r.citation?.booktitle, r.slug).toBeTruthy();
    }
  });

  it("the citation year agrees with the card's date and venue year", () => {
    for (const r of RESEARCH_ITEMS) {
      const year = r.citation!.year;
      if (r.startDate) expect(r.startDate.slice(0, 4), r.slug).toBe(String(year));
      const yy = r.venue?.match(/['’](\d{2})\b/)?.[1];
      if (yy) expect(`20${yy}`, r.slug).toBe(String(year));
    }
  });

  it('member links point at a public_id shape, and slugs are unique', () => {
    for (const r of RESEARCH_ITEMS)
      for (const a of r.authors) if (a.memberId) expect(a.memberId).toMatch(/^[a-z0-9-]+$/);
    const slugs = RESEARCH_ITEMS.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
