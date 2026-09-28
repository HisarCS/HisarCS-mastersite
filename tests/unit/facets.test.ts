import { describe, it, expect } from 'vitest';
import {
  conferenceOf,
  facetValues,
  filterItems,
  isVenueTag,
  type Facet,
} from '../../lib/domain/facets';

interface Doc {
  title: string;
  tags: string[];
  venue?: string;
}

const TAGS: Facet<Doc> = { key: 'tag', label: 'Interest', values: (d) => d.tags };
const VENUE: Facet<Doc> = {
  key: 'conf',
  label: 'Conference',
  values: (d) => (d.venue ? [d.venue] : []),
};
const FACETS = [TAGS, VENUE];
const text = (d: Doc) => d.title;

const DOCS: Doc[] = [
  { title: 'Otto', tags: ['Parametric CAD', 'Laser Cutting'], venue: 'SCF' },
  { title: 'Parametrix', tags: ['Parametric Design', 'LLM'], venue: 'Constructionism' },
  { title: 'Automata', tags: ['AR', 'Mechanics'], venue: 'Constructionism' },
  { title: 'Loose note', tags: [] },
];

describe('conferenceOf', () => {
  it('drops the year and anything after it', () => {
    expect(conferenceOf("IDC '26")).toBe('IDC');
    expect(conferenceOf("HRI '19, Daegu")).toBe('HRI');
    expect(conferenceOf('HCI International ’25')).toBe('HCI International');
    expect(conferenceOf("Constructionism '25")).toBe('Constructionism');
  });

  it('folds adjunct / workshop tracks into their conference', () => {
    expect(conferenceOf("SCF Adjunct '25")).toBe('SCF');
  });

  it('returns null for empty or year-only venues', () => {
    expect(conferenceOf(null)).toBeNull();
    expect(conferenceOf('  ')).toBeNull();
    expect(conferenceOf("'25")).toBeNull();
  });

  it('keeps venues without a year as-is', () => {
    expect(conferenceOf('ideaLab manuscript')).toBe('ideaLab manuscript');
  });
});

describe('isVenueTag', () => {
  it('spots tags that are really a venue + year', () => {
    expect(isVenueTag("IDC '26")).toBe(true);
    expect(isVenueTag('HCII ’25')).toBe(true);
    expect(isVenueTag('Robotics')).toBe(false);
    expect(isVenueTag('K-12')).toBe(false);
  });
});

describe('facetValues', () => {
  it('counts each value once per item, most common first, then A–Z', () => {
    expect(facetValues(DOCS, VENUE)).toEqual([
      { value: 'Constructionism', count: 2 },
      { value: 'SCF', count: 1 },
    ]);
  });

  it('dedupes a value repeated within one item', () => {
    const dup: Doc[] = [{ title: 'x', tags: ['AI', 'AI'] }];
    expect(facetValues(dup, TAGS)).toEqual([{ value: 'AI', count: 1 }]);
  });

  it('is empty for no items', () => {
    expect(facetValues([], TAGS)).toEqual([]);
  });
});

describe('filterItems', () => {
  it('returns everything for an empty query and no selection', () => {
    expect(filterItems(DOCS, { query: '  ', selected: {} }, FACETS, text)).toHaveLength(4);
  });

  it('matches the query against text and every facet value, case-insensitively', () => {
    const titles = (q: string) =>
      filterItems(DOCS, { query: q, selected: {} }, FACETS, text).map((d) => d.title);
    expect(titles('otto')).toEqual(['Otto']);
    expect(titles('laser')).toEqual(['Otto']); // tag
    expect(titles('constructionISM')).toEqual(['Parametrix', 'Automata']); // venue
  });

  it('requires every query word to match somewhere', () => {
    const r = filterItems(DOCS, { query: 'parametric llm', selected: {} }, FACETS, text);
    expect(r.map((d) => d.title)).toEqual(['Parametrix']);
  });

  it('ORs values within a facet and ANDs across facets', () => {
    const within = filterItems(DOCS, { query: '', selected: { tag: ['AR', 'LLM'] } }, FACETS, text);
    expect(within.map((d) => d.title)).toEqual(['Parametrix', 'Automata']);

    const across = filterItems(
      DOCS,
      { query: '', selected: { tag: ['AR', 'LLM'], conf: ['Constructionism'] } },
      FACETS,
      text,
    );
    expect(across.map((d) => d.title)).toEqual(['Parametrix', 'Automata']);

    const none = filterItems(
      DOCS,
      { query: '', selected: { tag: ['AR'], conf: ['SCF'] } },
      FACETS,
      text,
    );
    expect(none).toEqual([]);
  });

  it('ignores selections for facets it does not know, and empty selections', () => {
    const r = filterItems(DOCS, { query: '', selected: { nope: ['x'], tag: [] } }, FACETS, text);
    expect(r).toHaveLength(4);
  });
});
