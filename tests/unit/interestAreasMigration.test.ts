import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { INTEREST_AREAS } from '../../lib/domain/interests';

/** The migration seeds interest_areas from the code's table; the code table is
 *  the fallback when the DB is unreachable. They must start out identical. */
// (vitest runs from the repo root; jsdom rewrites import.meta.url)
const sql = readFileSync('supabase/migrations/20260928130000_interest_areas.sql', 'utf8');

describe('interest_areas migration', () => {
  it('seeds exactly INTEREST_AREAS, areas in display order', () => {
    const rows = [...sql.matchAll(/\('((?:[^']|'')+)', '((?:[^']|'')+)', (\d+)\)/g)].map((m) => ({
      area: m[1]!.replace(/''/g, "'"),
      tag: m[2]!.replace(/''/g, "'"),
      sort: Number(m[3]),
    }));
    const fromSql: Record<string, string[]> = {};
    for (const r of [...rows].sort((a, b) => a.sort - b.sort)) (fromSql[r.area] ??= []).push(r.tag);
    expect(fromSql).toEqual(INTEREST_AREAS);
  });

  it('turns on RLS: everyone reads, only admins write', () => {
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/for select\s+using \(true\)/i);
    expect(sql).toMatch(/using \(public\.is_admin\(\)\)\s+with check \(public\.is_admin\(\)\)/i);
  });
});
