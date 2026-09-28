import type { ResearchEntry, ResearchItem } from './types';

/**
 * "Cite this" — APA 7 and BibTeX for curated write-ups and member entries.
 * Pure and tested; the Cite dialog only displays and copies what these return.
 */

export interface CiteData {
  /** given-first display names ("E. Dayangaç", "Sedat Yalcin") */
  authors: string[];
  title: string;
  booktitle?: string;
  year?: number;
  pages?: string;
  doi?: string;
  url?: string;
  location?: string;
  publisher?: string;
}

/** Last word = family name; the rest = given names. */
export function splitName(name: string): { family: string; given: string } {
  const words = name.trim().split(/\s+/);
  const family = words.pop() ?? '';
  return { family, given: words.join(' ') };
}

const initials = (given: string) =>
  given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => `${w.replace(/\.$/, '')[0]}.`)
    .join(' ');

/** "Dayangaç, E." */
const apaName = (name: string) => {
  const { family, given } = splitName(name);
  return given ? `${family}, ${initials(given)}` : family;
};

const apaAuthors = (names: string[]) => {
  const list = names.map(apaName);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')}, & ${list.at(-1)}`;
};

/** end a sentence without doubling its punctuation */
const sentence = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);

export function toAPA(c: CiteData): string {
  const year = `(${c.year ?? 'n.d.'}).`;
  const parts = c.authors.length
    ? [sentence(apaAuthors(c.authors)), year, sentence(c.title)]
    : [sentence(c.title), year];
  if (c.booktitle) parts.push(`In ${c.booktitle}${c.pages ? ` (pp. ${c.pages})` : ''}.`);
  if (c.publisher) parts.push(sentence(c.publisher));
  if (c.doi) parts.push(`https://doi.org/${c.doi}`);
  else if (c.url) parts.push(c.url);
  return parts.join(' ');
}

/** ASCII lower-case for citation keys: "Yalçın" → "yalcin", "Işık" → "isik". */
const asciiKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const tex = (s: string) => s.replace(/([&%$#_{}])/g, '\\$1');

export function toBibTeX(c: CiteData): string {
  const firstWord = asciiKey(c.title.split(/[\s:]+/)[0] ?? '');
  const lead = c.authors.length ? asciiKey(splitName(c.authors[0]!).family) : '';
  const key = `${lead}${c.year ?? ''}${firstWord}`;
  const kind = c.booktitle ? 'inproceedings' : 'misc';
  const fields: [string, string | undefined][] = [
    [
      'author',
      c.authors.length
        ? c.authors
            .map((n) => {
              const { family, given } = splitName(n);
              return given ? `${family}, ${given}` : family;
            })
            .join(' and ')
        : undefined,
    ],
    ['title', `{${tex(c.title)}}`], // double braces keep capitalization
    ['booktitle', c.booktitle && tex(c.booktitle)],
    ['year', c.year ? String(c.year) : undefined],
    ['pages', c.pages?.replace(/[–—-]/, '--')],
    ['doi', c.doi],
    ['address', c.location && tex(c.location)],
    ['publisher', c.publisher && tex(c.publisher)],
    kind === 'misc'
      ? ['howpublished', c.url && `\\url{${c.url}}`]
      : ['url', c.doi ? undefined : c.url],
  ];
  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k} = {${v}},`)
    .join('\n');
  return `@${kind}{${key},\n${body}\n}`;
}

/** A curated write-up (lib/data/research.ts) as citation data. */
export function citationFromCurated(item: ResearchItem, url: string): CiteData {
  const c = item.citation;
  return {
    authors: item.authors.map((a) => a.name),
    title: c?.title ?? item.title,
    booktitle: c?.booktitle ?? item.venue,
    year: c?.year ?? (item.startDate ? Number(item.startDate.slice(0, 4)) : undefined),
    pages: c?.pages,
    doi: c?.doi,
    location: c?.location,
    publisher: c?.publisher,
    url,
  };
}

/** A member-created entry: its members, then outside collaborators. */
export function citationFromEntry(entry: ResearchEntry, url: string): CiteData {
  return {
    authors: [...entry.members.map((m) => m.name), ...entry.externalAuthors.map((a) => a.name)],
    title: entry.title,
    booktitle: entry.venue ?? undefined,
    year: entry.presentedOn ? Number(entry.presentedOn.slice(0, 4)) : undefined,
    url,
  };
}
