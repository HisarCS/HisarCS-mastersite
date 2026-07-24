const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a value for HTML text or a double-quoted attribute. React escapes text
 * nodes automatically, so this is only for the rare dangerouslySetInnerHTML or
 * non-React string building — keep those to a minimum.
 */
export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPE[c]!);
}

/**
 * Sanitize a URL for an href/src: allow relative paths and http/https/mailto;
 * reject javascript:, data:, and any other scheme (returns '#'). React does NOT
 * sanitize javascript: hrefs, so every user/DB-supplied URL must pass through
 * this before it reaches an anchor.
 */
export function safeUrl(u: unknown): string {
  const s = String(u ?? '').trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^(?:https?|mailto):/i.test(s)) return '#';
  return s;
}
