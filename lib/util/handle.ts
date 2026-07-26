/**
 * GitHub-handle helpers for the delete-account confirmation. The user confirms
 * by typing their GitHub username (server-owned, always present, unique — unlike
 * a display name). Matching is forgiving of a pasted "@" and stray whitespace,
 * and case-insensitive.
 */

/**
 * Normalize a handle for matching: trim, drop leading "@"(s), lowercase. Uses
 * PLAIN toLowerCase, NOT the Turkish locale — locale-aware lowercasing maps
 * "I"→"ı" and would break handles like "Ipek".
 */
export function normalizeHandle(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

/** True when `input` matches `expected` after normalization (never matches empty). */
export function handlesMatch(
  input: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  const a = normalizeHandle(input);
  return a.length > 0 && a === normalizeHandle(expected);
}
