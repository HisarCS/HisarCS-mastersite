/**
 * Interest areas — the handful of umbrellas the directories group research
 * by, so near-duplicate tags ("Parametric CAD", "Parametric Design") meet in
 * one cluster instead of splitting the graph. Tags stay as they are on the
 * cards and in search; only grouping/filtering uses the areas.
 *
 * Edit this table to re-file tags. Keys are the areas (in display order),
 * values the tags that belong there, lower case. A tag may sit in several
 * areas; a tag listed nowhere shows up as its own area until it's filed.
 */
export const INTEREST_AREAS: Record<string, string[]> = {
  'Parametric Design': ['parametric cad', 'parametric design'],
  'Digital Fabrication': ['laser cutting', 'fabrication', 'kits', '3d printing'],
  Robotics: ['robotics', 'biomimetic robots', 'mechanics'],
  AI: ['ai', 'llm', 'pose classification', 'ai literacy'],
  Learning: ['education', 'k-12', 'algorithmic thinking', 'ai literacy'],
  'HCI & AR': ['ar', 'tangible', 'dance'],
};

const AREAS_BY_TAG = new Map<string, string[]>();
for (const [area, tags] of Object.entries(INTEREST_AREAS))
  for (const t of tags) AREAS_BY_TAG.set(t, [...(AREAS_BY_TAG.get(t) ?? []), area]);

/** The areas a set of tags falls into, in tag order, each once. */
export function interestAreasOf(tags: string[]): string[] {
  return [...new Set(tags.flatMap((t) => AREAS_BY_TAG.get(t.toLowerCase()) ?? [t]))];
}
