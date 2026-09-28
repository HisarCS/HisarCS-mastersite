import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs script module, no type declarations
import { buildSnapshot, sqlLiteral, storageVariants } from '../../scripts/snapshot/transform.mjs';

const PROD = 'https://prod.supabase.co';
const LOCAL = 'http://127.0.0.1:54321';

const rows = () => ({
  people: [
    {
      id: 'p1',
      public_id: 'ada',
      user_id: 'auth-uuid-from-prod',
      full_name: "Ada O'Neil",
      graduation_year: 2026,
      bio: 'Line one\nline two',
      avatar_url: `${PROD}/storage/v1/object/public/avatars/u1/avatar-1024.jpg?v=9`,
      avatar_color: null,
      resume_url: 'https://drive.google.com/x',
      github_username: 'ada',
      is_published: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  ],
  fields: [
    { id: 3, name: 'Robotics', created_by: 'p1' },
    { id: 7, name: 'AI', created_by: 'someone-unpublished' },
  ],
  person_fields: [
    { person_id: 'p1', field_id: 3 },
    { person_id: 'ghost', field_id: 7 },
  ],
  research: [
    {
      id: 'r1',
      public_id: 'otto',
      title: 'Otto',
      description: 'd',
      avatar_url: `${PROD}/storage/v1/object/public/research-files/r1/hero-w2400.jpg`,
      created_by: 'p1',
      is_published: true,
      external_authors: [{ name: 'Guest' }],
      page: { version: 2, markdown: "it's ![x](r1/pic-w2400.jpg)" },
      venue: null,
      presented_on: '2025-11-20',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  research_fields: [{ research_id: 'r1', field_id: 3 }],
  research_members: [
    { research_id: 'r1', person_id: 'p1', role: 'lead', sort_order: 0 },
    { research_id: 'r-unpublished', person_id: 'p1', role: 'x', sort_order: 0 },
  ],
  research_links: [],
  research_files: [
    {
      id: 'f1',
      research_id: 'r1',
      storage_path: 'r1/pic-w2400.jpg',
      kind: 'image',
      caption: null,
      sort_order: 0,
    },
  ],
});

describe('sqlLiteral', () => {
  it('quotes strings (doubling quotes), passes numbers/booleans, NULLs nullish', () => {
    expect(sqlLiteral("O'Neil")).toBe("'O''Neil'");
    expect(sqlLiteral(2026)).toBe('2026');
    expect(sqlLiteral(true)).toBe('true');
    expect(sqlLiteral(null)).toBe('null');
    expect(sqlLiteral(undefined)).toBe('null');
  });

  it('serializes objects as jsonb', () => {
    expect(sqlLiteral({ a: "it's" })).toBe(`'{"a":"it''s"}'::jsonb`);
  });
});

describe('storageVariants', () => {
  it('expands the size ladders the site requests', () => {
    expect(storageVariants('avatars', 'u1/avatar-1024.jpg')).toEqual([
      'u1/avatar-1024.jpg',
      'u1/avatar-128.jpg',
      'u1/avatar-256.jpg',
      'u1/avatar-512.jpg',
    ]);
    expect(storageVariants('research-files', 'r1/pic-w2400.jpg')).toEqual([
      'r1/pic-w2400.jpg',
      'r1/pic-w800.jpg',
      'r1/pic-w1600.jpg',
    ]);
    expect(storageVariants('resumes', 'u1/resume.pdf')).toEqual(['u1/resume.pdf']);
  });
});

describe('buildSnapshot', () => {
  const snap = () => buildSnapshot(rows(), { prodUrl: PROD, localUrl: LOCAL });

  it('never carries production auth links over', () => {
    expect(snap().sql).not.toContain('auth-uuid-from-prod');
  });

  it('rewrites production storage URLs to the local stack and lists the files to copy', () => {
    const s = snap();
    expect(s.sql).toContain(`${LOCAL}/storage/v1/object/public/avatars/u1/avatar-1024.jpg?v=9`);
    expect(s.sql).not.toContain(PROD);
    expect(s.objects).toContainEqual({ bucket: 'avatars', path: 'u1/avatar-1024.jpg' });
    expect(s.objects).toContainEqual({ bucket: 'research-files', path: 'r1/hero-w2400.jpg' });
    expect(s.objects).toContainEqual({ bucket: 'research-files', path: 'r1/pic-w2400.jpg' });
  });

  it('leaves external URLs alone', () => {
    expect(snap().sql).toContain("'https://drive.google.com/x'");
  });

  it('drops rows pointing at anything not in the snapshot', () => {
    const s = snap().sql;
    expect(s).not.toContain('ghost');
    expect(s).not.toContain('r-unpublished');
    // a field whose creator isn't published keeps the field, loses the link
    expect(s).toMatch(/\(7, 'AI', null\)/);
  });

  it('replaces the local rows in one transaction, fields keeping their ids', () => {
    const s = snap().sql;
    expect(s.startsWith('begin;')).toBe(true);
    expect(s.trim().endsWith('commit;')).toBe(true);
    expect(s).toMatch(/truncate[^;]*people[^;]*research[^;]*fields[^;]*cascade;/i);
    expect(s).toContain('overriding system value');
    expect(s).toContain('\'{"version":2,"markdown":"it\'\'s ![x](r1/pic-w2400.jpg)"}\'::jsonb');
  });
});
