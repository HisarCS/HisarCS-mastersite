import type { Member, Project } from '../domain/types';
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
    projects: [],
  };
}

export function mockProject(id: string): Project {
  const title = id ? titleize(id) : 'Untitled Project';
  return {
    dbId: '',
    publicId: id || 'project',
    title,
    published: true,
    avatarUrl: null,
    fields: [],
    members: [],
    description: 'Preview — connect the site to Supabase to load this project.',
    links: [],
    files: [],
  };
}
