import type { Member, MemberCard, ResearchEntry, ResearchEntryCard } from '../domain/types';
import { cohortFor } from '../util/date';

/**
 * Local-dev-only graceful fallback (ADR-0009). When the LOCAL backend is
 * unreachable, build a placeholder derived from the requested id so the page
 * still matches its URL — never a hard-coded person. Production NEVER fakes
 * content; callers only reach this when currentEnv() === 'local'.
 */
const DISCIPLINES = [
  'Robotics',
  'Electronics',
  'Woodworking',
  'Textiles',
  'Game Design',
  'Ceramics',
  'Biodesign',
  'CS & AI',
  'Product Design',
  '3D Printing',
];

function titleize(s: string): string {
  return s
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mockPerson(id: string): Member {
  const clean = String(id || '').replace(/^p\d+$/i, ''); // ignore legacy ?id=pN links
  const name = clean ? titleize(clean) : 'ideaLab Maker';
  const seed = hashStr(clean || name);
  const alumni = seed % 3 === 0;
  const gradYear = alumni ? 2020 + (seed % 6) : 2027 + (seed % 3);
  return {
    publicId: clean || 'maker',
    name,
    gradYear,
    cohort: cohortFor(gradYear),
    fields: [DISCIPLINES[seed % 10]!, DISCIPLINES[(seed + 3) % 10]!],
    bio: 'Preview — connect the site to Supabase to load this profile.',
    avatarUrl: null,
    avatarColor: null,
    resumeUrl: null,
    githubUsername: null,
    research: [],
  };
}

// slugify a mock name the way the DB does (Turkish-aware), so mock-mode pixel
// links resolve on the person page instead of pointing at opaque ids
function mockSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ıİ]/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Local-dev mock directory for the homepage pixel mark. */
export function mockMembers(): MemberCard[] {
  const disciplines = [
    'Robotics',
    'Electronics',
    'Woodworking',
    'Textiles',
    'Game Design',
    'Ceramics',
    'Biodesign',
    'CS & AI',
    'Product Design',
    '3D Printing',
  ];
  const names = [
    'Mert Karakaş',
    'Elif Demir',
    'Kaan Yıldız',
    'Zeynep Aksoy',
    'Deniz Çelik',
    'Selin Arslan',
    'Emre Koç',
    'Aylin Şahin',
    'Baran Öztürk',
    'Ceren Kaya',
    'Mehmet Aydın',
    'İpek Doğan',
    'Arda Güneş',
    'Naz Erdem',
    'Cem Yılmaz',
    'Lara Polat',
    'Umut Kara',
    'Defne Ateş',
    'Ege Turan',
    'Melis Ünal',
    'Yiğit Sönmez',
    'Ada Korkmaz',
    'Ozan Tekin',
    'Sude Bilgin',
    'Alp Erten',
    'Mina Sezer',
  ];
  return names.map((name, i) => ({
    id: `p${i + 1}`,
    publicId: mockSlug(name),
    name,
    cohort: i % 3 === 0 ? 'alumni' : 'student',
    avatarUrl: `https://i.pravatar.cc/120?img=${(i % 70) + 1}`,
    avatarColor: null,
    fields: [disciplines[i % disciplines.length]!],
  }));
}

/** Local-dev mock directory of member-created research entries. */
export function mockResearchEntries(): ResearchEntryCard[] {
  const titles = [
    'Solar Lemon Press',
    'Parse',
    'Otto',
    'Automata Loom',
    'Dancar',
    'Pomelo',
    'Testudo',
    'Parametrix',
    'Reef Sensor',
    'Kinetic Type',
    'Foldform',
    'Tide Clock',
  ];
  return titles.map((title, i) => ({
    id: `proj${i + 1}`,
    publicId: mockSlug(title),
    title,
    avatarUrl: null,
  }));
}

export function mockResearchEntry(id: string): ResearchEntry {
  const title = id ? titleize(id) : 'Untitled Research';
  return {
    dbId: '',
    publicId: id || 'research',
    title,
    published: true,
    avatarUrl: null,
    fields: [],
    fieldIds: [],
    members: [],
    description: 'Preview — connect the site to Supabase to load this research.',
    links: [],
    files: [],
  };
}
