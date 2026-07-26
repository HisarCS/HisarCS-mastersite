/** Diff a member's selected field ids against what's already saved → the rows to
 *  add and remove. Pure/testable; used by syncPersonFields (member.html syncTags). */
export function diffFieldIds(
  before: number[],
  selected: number[],
): { toAdd: number[]; toRemove: number[] } {
  const b = new Set(before);
  const s = new Set(selected);
  return {
    toAdd: [...s].filter((x) => !b.has(x)),
    toRemove: [...b].filter((x) => !s.has(x)),
  };
}
