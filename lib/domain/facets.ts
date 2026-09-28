/**
 * Facets — the ways a directory can be sorted, filtered, and drawn as a graph
 * ("by interest", "by conference", "by class", …). Pure and tested.
 *
 * A facet is one entry: a key, a label, and a function returning an item's
 * values for it. The directories list their facets in a table
 * (lib/domain/directoryFacets.ts); search, filter chips, grouping, and the
 * network graph all read that table, so a new way to slice the lab is one new
 * entry — nothing else changes.
 */

export interface Facet<T> {
  /** stable id — used for selections and graph node ids */
  key: string;
  /** shown in the "Group by" control and above the filter chips */
  label: string;
  values: (item: T) => string[];
  /** how values list (chips, grid sections); default: most common first */
  order?: (a: string, b: string) => number;
}

/** Which values are ticked, per facet key. */
export type Selection = Record<string, string[]>;

export interface FilterState {
  query: string;
  selected: Selection;
}

/** A year token: '26, ’25 … */
const YEAR = /\s*['’]\d{2}\b.*$/;

/**
 * The conference a venue string belongs to, without the year:
 * "IDC '26" → "IDC", "HRI '19, Daegu" → "HRI", "SCF Adjunct '25" → "SCF".
 * Adjunct/workshop tracks fold into their conference so they cluster together.
 */
export function conferenceOf(venue: string | null | undefined): string | null {
  const name = (venue ?? '')
    .replace(YEAR, '')
    .replace(/\s+(adjunct|workshops?)$/i, '')
    .trim();
  return name || null;
}

/** Tags like "IDC '26" duplicate the venue — the Interest facet skips them. */
export function isVenueTag(tag: string): boolean {
  return /['’]\d{2}\b/.test(tag);
}

/** Each value with how many items carry it — in the facet's own order, or
 *  most common first, then A–Z. */
export function facetValues<T>(items: T[], facet: Facet<T>): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const it of items)
    for (const v of new Set(facet.values(it))) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) =>
      facet.order
        ? facet.order(a.value, b.value)
        : b.count - a.count || a.value.localeCompare(b.value),
    );
}

/**
 * Items matching the search and the ticked values. Every query word must
 * appear in the item's text or one of its facet values; ticked values OR
 * within a facet and AND across facets.
 */
export function filterItems<T>(
  items: T[],
  state: FilterState,
  facets: Facet<T>[],
  text: (item: T) => string,
): T[] {
  const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  const active = facets
    .map((f) => ({ f, want: new Set(state.selected[f.key] ?? []) }))
    .filter(({ want }) => want.size > 0);

  return items.filter((it) => {
    for (const { f, want } of active) if (!f.values(it).some((v) => want.has(v))) return false;
    if (words.length === 0) return true;
    const hay = [text(it), ...facets.flatMap((f) => f.values(it))].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/**
 * Sections for a grouped grid: one per value (in facetValues order), items
 * under every value they carry, then a trailing `null` section for items
 * with none.
 */
export function groupItems<T>(items: T[], facet: Facet<T>): { value: string | null; items: T[] }[] {
  const sections = facetValues(items, facet).map(({ value }) => ({
    value: value as string | null,
    items: items.filter((it) => facet.values(it).includes(value)),
  }));
  const rest = items.filter((it) => facet.values(it).length === 0);
  return rest.length ? [...sections, { value: null, items: rest }] : sections;
}
