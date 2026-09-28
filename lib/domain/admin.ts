import type { ParseResult } from '../util/chartSpec';

/**
 * Admin-panel rules. Pure and tested. The database is the real gate (RLS +
 * is_admin()); these keep the panel from sending what it would refuse and
 * from letting an admin lock the lab out.
 */

/** Same rule as admin_github_logins' CHECK (and GitHub's own). */
const GITHUB_LOGIN = /^[a-z0-9][a-z0-9-]{0,38}$/;

export function normalizeGithubLogin(input: string): ParseResult<string> {
  const login = input.trim().replace(/^@/, '').toLowerCase();
  return GITHUB_LOGIN.test(login)
    ? { ok: login }
    : { error: `"${input.trim()}" isn't a GitHub username` };
}

/** Why `login` can't be removed from the admins right now, or null. */
export function adminRemovalBlocker(login: string, me: string, admins: string[]): string | null {
  if (login.toLowerCase() === me.toLowerCase())
    return "You can't remove yourself — ask another admin to.";
  if (admins.length <= 1) return "That's the last admin — add another first.";
  return null;
}

const name = (input: string, what: string): ParseResult<string> => {
  const v = input.trim().replace(/\s+/g, ' ');
  if (!v) return { error: `give the ${what} a name` };
  if (v.length > 60) return { error: `keep ${what} names under 60 characters` };
  return { ok: v };
};

/** Tags are stored lower case (interest_areas' CHECK). */
export const normalizeTag = (input: string): ParseResult<string> => {
  const r = name(input, 'tag');
  return r.error !== undefined ? r : { ok: r.ok.toLowerCase() };
};

export const normalizeArea = (input: string): ParseResult<string> => name(input, 'area');
