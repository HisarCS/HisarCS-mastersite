import { describe, it, expect } from 'vitest';
import {
  MEMBER_FACETS,
  RESEARCH_FACETS,
  researchTagFilter,
  researchYear,
  type ResearchDirItem,
} from '../../lib/domain/directoryFacets';
import type { MemberCard } from '../../lib/domain/types';

const facet = <T>(list: { key: string; values: (t: T) => string[] }[], key: string) =>
  list.find((f) => f.key === key)!;

const otto: ResearchDirItem = {
  title: 'Otto',
  summary: 'Parametric CAD',
  venue: "SCF Adjunct '25",
  date: '2025',
  tags: ['Parametric CAD', 'Laser Cutting', "SCF '25"],
};

describe('researchYear', () => {
  it('prefers the date (ISO or bare year)', () => {
    expect(researchYear({ ...otto, date: '2026-06-15' })).toBe('2026');
    expect(researchYear({ ...otto, date: '2019' })).toBe('2019');
  });

  it("falls back to the venue's two-digit year", () => {
    expect(researchYear({ ...otto, date: null, venue: "HRI '19, Daegu" })).toBe('2019');
    expect(researchYear({ ...otto, date: undefined, venue: 'HCI International ’25' })).toBe('2025');
  });

  it('is null when neither says', () => {
    expect(researchYear({ ...otto, date: null, venue: 'ideaLab preprint' })).toBeNull();
  });
});

describe('RESEARCH_FACETS', () => {
  it('interest is the interest areas of the tags, venue-year tags left out', () => {
    expect(facet(RESEARCH_FACETS, 'interest').values(otto)).toEqual([
      'Parametric Design',
      'Digital Fabrication',
    ]);
  });

  it('conference is the normalized venue', () => {
    expect(facet(RESEARCH_FACETS, 'conference').values(otto)).toEqual(['SCF']);
    expect(facet(RESEARCH_FACETS, 'conference').values({ ...otto, venue: null })).toEqual([]);
  });

  it('year comes from researchYear', () => {
    expect(facet(RESEARCH_FACETS, 'year').values(otto)).toEqual(['2025']);
  });

  it('years and classes list newest first', () => {
    const years = facet(RESEARCH_FACETS, 'year') as { order?: (a: string, b: string) => number };
    expect(['2019', '2026', '2025'].sort(years.order)).toEqual(['2026', '2025', '2019']);
    const classes = facet(MEMBER_FACETS, 'class') as { order?: (a: string, b: string) => number };
    expect(['Class of 2019', 'Class of 2027'].sort(classes.order)).toEqual([
      'Class of 2027',
      'Class of 2019',
    ]);
  });

  it('keys are unique', () => {
    const keys = RESEARCH_FACETS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('MEMBER_FACETS', () => {
  const ada: MemberCard = {
    id: '1',
    publicId: 'ada',
    name: 'Ada',
    cohort: 'alumni',
    gradYear: 2020,
    avatarUrl: null,
    avatarColor: null,
    fields: ['Robotics', 'CS & AI'],
  };

  it('interest, class, and cohort', () => {
    expect(facet(MEMBER_FACETS, 'interest').values(ada)).toEqual(['Robotics', 'CS & AI']);
    expect(facet(MEMBER_FACETS, 'class').values(ada)).toEqual(['Class of 2020']);
    expect(facet(MEMBER_FACETS, 'cohort').values(ada)).toEqual(['Alumni']);
  });

  it('a member without a year has no class', () => {
    expect(facet(MEMBER_FACETS, 'class').values({ ...ada, gradYear: null })).toEqual([]);
  });
});

describe('researchTagFilter', () => {
  it('an interest tag filters by its interest area', () => {
    expect(researchTagFilter('Parametric CAD')).toEqual({
      facet: 'interest',
      value: 'Parametric Design',
    });
  });

  it('a venue tag filters by its conference, without the year', () => {
    expect(researchTagFilter("SCF Adjunct '25")).toEqual({ facet: 'conference', value: 'SCF' });
  });

  it("an unfiled tag filters by itself (it's its own area)", () => {
    expect(researchTagFilter('Ceramics')).toEqual({ facet: 'interest', value: 'Ceramics' });
  });
});
