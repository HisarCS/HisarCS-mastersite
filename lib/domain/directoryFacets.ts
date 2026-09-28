import { conferenceOf, isVenueTag, type Facet } from './facets';
import { interestAreasOf } from './interests';
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
}

/** "2026-06-15" / "2026" → "2026"; else the venue's '25 → "2025"; else null. */
export function researchYear(item: ResearchDirItem): string | null {
  const fromDate = item.date?.match(/^(\d{4})/)?.[1];
  if (fromDate) return fromDate;
  const yy = item.venue?.match(/['’](\d{2})\b/)?.[1];
  return yy ? `20${yy}` : null;
}

export const RESEARCH_FACETS: Facet<ResearchDirItem>[] = [
  {
    key: 'interest',
    label: 'Interest',
    // umbrella areas, not raw tags — near-duplicates meet in one cluster
    values: (r) => interestAreasOf(r.tags.filter((t) => !isVenueTag(t))),
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

export const researchText = (r: ResearchDirItem) => `${r.title} ${r.summary ?? ''}`;

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
