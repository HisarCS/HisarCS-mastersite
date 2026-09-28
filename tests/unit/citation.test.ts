import { describe, it, expect } from 'vitest';
import {
  citationFromCurated,
  citationFromEntry,
  splitName,
  toAPA,
  toBibTeX,
  type CiteData,
} from '../../lib/domain/citation';
import { getResearchItem } from '../../lib/data/research';
import type { ResearchEntry } from '../../lib/domain/types';

const parametrix: CiteData = {
  authors: ['E. Dayangaç', 'M. Bener', 'S. Yalçın'],
  title:
    'Parametrix: A Novel Approach to Teaching Parametric Design in K12 and Digital Fabrication Education',
  booktitle: 'Constructionism Conference Proceedings',
  year: 2025,
  pages: '503–506',
  doi: '10.21240/constr/2025/43.X',
};

describe('splitName', () => {
  it('takes the last word as the family name', () => {
    expect(splitName('Emre Dayangac')).toEqual({ family: 'Dayangac', given: 'Emre' });
    expect(splitName('A. B. Bas')).toEqual({ family: 'Bas', given: 'A. B.' });
    expect(splitName('Lara Ceren Ergenç')).toEqual({ family: 'Ergenç', given: 'Lara Ceren' });
  });

  it('a single word is all family name', () => {
    expect(splitName('Plato')).toEqual({ family: 'Plato', given: '' });
  });
});

describe('toAPA', () => {
  it('formats a proceedings paper: initials, "&" before the last author, pages, DOI', () => {
    expect(toAPA(parametrix)).toBe(
      'Dayangaç, E., Bener, M., & Yalçın, S. (2025). Parametrix: A Novel Approach to Teaching ' +
        'Parametric Design in K12 and Digital Fabrication Education. In Constructionism ' +
        'Conference Proceedings (pp. 503–506). https://doi.org/10.21240/constr/2025/43.X',
    );
  });

  it('turns given names into initials', () => {
    expect(toAPA({ ...parametrix, authors: ['Lara Ceren Ergenç'] })).toMatch(/^Ergenç, L\. C\. /);
  });

  it('one and two authors', () => {
    expect(toAPA({ ...parametrix, authors: ['Sedat Yalcin'] })).toMatch(/^Yalcin, S\. \(2025\)/);
    expect(toAPA({ ...parametrix, authors: ['Sedat Yalcin', 'Emre Dayangac'] })).toMatch(
      /^Yalcin, S\., & Dayangac, E\. \(2025\)/,
    );
  });

  it('with no authors the title leads, and missing year reads n.d.', () => {
    expect(toAPA({ authors: [], title: 'Pixel Wall', year: undefined })).toBe(
      'Pixel Wall. (n.d.).',
    );
  });

  it('adds the publisher, and a URL when there is no DOI', () => {
    const c = toAPA({ ...parametrix, doi: undefined, publisher: 'ACM', url: 'https://x.org/p' });
    expect(c).toMatch(/\(pp\. 503–506\)\. ACM\. https:\/\/x\.org\/p$/);
  });
});

describe('toBibTeX', () => {
  it('writes an @inproceedings with a stable key, -- page ranges, and the DOI', () => {
    expect(toBibTeX(parametrix)).toBe(
      [
        '@inproceedings{dayangac2025parametrix,',
        '  author = {Dayangaç, E. and Bener, M. and Yalçın, S.},',
        '  title = {{Parametrix: A Novel Approach to Teaching Parametric Design in K12 and Digital Fabrication Education}},',
        '  booktitle = {Constructionism Conference Proceedings},',
        '  year = {2025},',
        '  pages = {503--506},',
        '  doi = {10.21240/constr/2025/43.X},',
        '}',
      ].join('\n'),
    );
  });

  it('escapes TeX specials', () => {
    const b = toBibTeX({ authors: ['A B'], title: 'R&D at 100% for $5 #1', year: 2020 });
    expect(b).toContain('title = {{R\\&D at 100\\% for \\$5 \\#1}}');
  });

  it('is @misc with the URL when there is no venue, and keys from the title with no authors', () => {
    const b = toBibTeX({ authors: [], title: 'Işık Ağı', year: 2026, url: 'https://x.org' });
    expect(b.split('\n')[0]).toBe('@misc{2026isik,');
    expect(b).toContain('  howpublished = {\\url{https://x.org}},');
  });
});

describe('citationFromCurated / citationFromEntry', () => {
  it('curated: authors, the full title, and the venue details', () => {
    const c = citationFromCurated(getResearchItem('otto')!, 'https://site/research?id=otto');
    expect(c.authors[1]).toBe('Emre Dayangac');
    expect(c.title).toMatch(/^Otto: A Multi-Modal Platform/);
    expect(c.booktitle).toMatch(/Computational Fabrication/);
    expect(c.year).toBe(2025);
    expect(c.url).toBe('https://site/research?id=otto');
  });

  it('member entry: members then outside collaborators, venue, year from the date', () => {
    const entry = {
      title: 'Pixel Wall',
      venue: "IDC '26",
      presentedOn: '2026-06-15',
      members: [{ name: 'İpek Doğan' }, { name: 'Elif Demir' }],
      externalAuthors: [{ name: 'Guest Person' }],
    } as unknown as ResearchEntry;
    const c = citationFromEntry(entry, 'https://site/research?id=pixel-wall');
    expect(c.authors).toEqual(['İpek Doğan', 'Elif Demir', 'Guest Person']);
    expect(c.booktitle).toBe("IDC '26");
    expect(c.year).toBe(2026);
  });
});
