import { conferenceOf, isVenueTag, type Facet } from './facets';
import { INTEREST_AREAS, interestAreasOf, type InterestTable } from './interests';
import type { MemberCard } from './types';

/** "2026" before "2025"; "Class of 2027" before "Class of 2019". */
const newestFirst = (a: string, b: string) => b.localeCompare(a, 'en', { numeric: true });

/**
 * The facet tables for the two directories. To add a way of slicing the lab
 * (by author, by lab room, …) append an entry here — search, filter chips,
 * "Group by", and the network graph pick it up.
 */

/** What the research directory knows about each entry (curated or member-made). */
export interface ResearchDirItem {
  title: string;
  summary?: string;
  venue?: string | null;
  /** ISO date or bare year */
  date?: string | null;
  tags: string[];
  /** the write-up's text, when loaded — searched along with title + summary */
  body?: string;
}

/** "2026-06-15" / "2026" → "2026"; else the venue's '25 → "2025"; else null. */
export function researchYear(item: ResearchDirItem): string | null {
  const fromDate = item.date?.match(/^(\d{4})/)?.[1];
  if (fromDate) return fromDate;
  const yy = item.venue?.match(/['’](\d{2})\b/)?.[1];
  return yy ? `20${yy}` : null;
}

/** The research facets for an interest-area table (the admin-edited one from
 *  the database when loaded). */
export function researchFacets(table: InterestTable): Facet<ResearchDirItem>[] {
  return [
    {
      key: 'interest',
      label: 'Interest',
      // umbrella areas, not raw tags — near-duplicates meet in one cluster
      values: (r) =>
        interestAreasOf(
          r.tags.filter((t) => !isVenueTag(t)),
          table,
        ),
    },
    {
      key: 'conference',
      label: 'Conference',
      values: (r) => {
        const c = conferenceOf(r.venue);
        return c ? [c] : [];
      },
    },
    {
      key: 'year',
      label: 'Year',
      order: newestFirst,
      values: (r) => {
        const y = researchYear(r);
        return y ? [y] : [];
      },
    },
  ];
}

/** With the built-in interest areas (before the database's have loaded). */
export const RESEARCH_FACETS = researchFacets(INTEREST_AREAS);

export const researchText = (r: ResearchDirItem) => `${r.title} ${r.summary ?? ''} ${r.body ?? ''}`;

/** The research filter a single tag stands for: a venue tag ("IDC '26") → its
 *  conference; anything else → its interest area. For tag chips and links. */
export function researchTagFilter(
  tag: string,
  table: InterestTable = INTEREST_AREAS,
): { facet: string; value: string } {
  return isVenueTag(tag)
    ? { facet: 'conference', value: conferenceOf(tag) ?? tag }
    : { facet: 'interest', value: interestAreasOf([tag], table)[0] ?? tag };
}

export const MEMBER_FACETS: Facet<MemberCard>[] = [
  { key: 'interest', label: 'Interest', values: (m) => m.fields },
  {
    key: 'class',
    label: 'Class',
    order: newestFirst,
    values: (m) => (m.gradYear ? [`Class of ${m.gradYear}`] : []),
  },
  {
    key: 'cohort',
    label: 'Cohort',
    values: (m) => [m.cohort === 'alumni' ? 'Alumni' : 'Student'],
  },
];

export const memberText = (m: MemberCard) => m.name;
