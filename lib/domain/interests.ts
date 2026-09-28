/**
 * Interest areas — the handful of umbrellas the directories group research
 * by, so near-duplicate tags ("Parametric CAD", "Parametric Design") meet in
 * one cluster instead of splitting the graph. Tags stay as they are on the
 * cards and in search; only grouping/filtering uses the areas.
 *
 * The live table is in the database (interest_areas, edited by admins at
 * /admin); this one seeded it and is the fallback when the DB can't be read.
 * Keys are the areas (display order), values their tags, lower case. A tag
 * may sit in several areas; a tag listed nowhere is its own area until filed.
 */
export const INTEREST_AREAS: InterestTable = {
  'Parametric Design': ['parametric cad', 'parametric design'],
  'Digital Fabrication': ['laser cutting', 'fabrication', 'kits', '3d printing'],
  Robotics: ['robotics', 'biomimetic robots', 'mechanics'],
  AI: ['ai', 'llm', 'pose classification', 'ai literacy'],
  Learning: ['education', 'k-12', 'algorithmic thinking', 'ai literacy'],
  'HCI & AR': ['ar', 'tangible', 'dance'],
};

/** Interest-area table: area → its tags (lower case), in display order. */
export type InterestTable = Record<string, string[]>;

/** tag → areas, built once per table */
const indexes = new WeakMap<InterestTable, Map<string, string[]>>();
function areasByTag(table: InterestTable): Map<string, string[]> {
  let idx = indexes.get(table);
  if (!idx) {
    idx = new Map();
    for (const [area, tags] of Object.entries(table))
      for (const t of tags) idx.set(t.toLowerCase(), [...(idx.get(t.toLowerCase()) ?? []), area]);
    indexes.set(table, idx);
  }
  return idx;
}

/** The areas a set of tags falls into, in tag order, each once. `table` is
 *  the admin-edited one from the database when loaded, else this file's. */
export function interestAreasOf(tags: string[], table: InterestTable = INTEREST_AREAS): string[] {
  const idx = areasByTag(table);
  return [...new Set(tags.flatMap((t) => idx.get(t.toLowerCase()) ?? [t]))];
}

/** interest_areas rows → table: areas ordered by `sort`, then name. */
export function tableFromRows(rows: { area: string; tag: string; sort: number }[]): InterestTable {
  const sorted = [...rows].sort((a, b) => a.sort - b.sort || a.area.localeCompare(b.area));
  const table: InterestTable = {};
  for (const r of sorted) (table[r.area] ??= []).push(r.tag);
  return table;
}
