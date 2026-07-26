import { getSupabase } from '../supabase';
import { purgeMyStorage } from './storage';
import type { MyProfile } from '../domain/types';
import type { Verdict } from '../domain/memberState';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AuthUser {
  userId: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
}

/** Current signed-in user (from the persisted session), or null. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) return null;
    const m: any = session.user.user_metadata ?? {};
    return {
      userId: session.user.id,
      githubLogin: m.user_name ?? m.preferred_username ?? '',
      name: m.full_name ?? m.name ?? m.user_name ?? null,
      avatarUrl: m.avatar_url ?? null,
    };
  } catch {
    return null;
  }
}

/** Subscribe to sign-in / sign-out. Returns an unsubscribe fn. */
export function onAuthChange(cb: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((evt) => {
    if (evt === 'INITIAL_SESSION' || evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') cb();
  });
  return () => data.subscription.unsubscribe();
}

/** Start the GitHub OAuth redirect. Returns an error message or null. */
export async function signInWithGitHub(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'no backend configured';
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'github',
    // scopes are ignored by GitHub Apps but kept so a classic OAuth app also works
    options: { redirectTo: location.origin + location.pathname, scopes: 'read:org' },
  });
  return error?.message ?? null;
}

/**
 * Sign out with scope:'local' — clears the browser session with no server call,
 * so it still works when the server session is already gone (e.g. right after
 * account deletion), which a default global sign-out chokes on.
 */
export async function signOutLocal(): Promise<void> {
  const sb = getSupabase();
  try {
    if (sb) await sb.auth.signOut({ scope: 'local' });
  } catch (e) {
    console.warn('ideaLab: signOut failed, clearing locally', e);
  }
}

/**
 * Server-authoritative org-membership check (invokes the verify-org-member Edge
 * Function, which also writes the org_members roster RLS enforces).
 * member = active org member · notmember = not in the org · unverifiable = the
 * check couldn't run (treated as a soft failure, not a definitive "no").
 */
export async function verifyOrgMembership(): Promise<{ verdict: Verdict; reason: string }> {
  const sb = getSupabase();
  if (!sb) return { verdict: 'unverifiable', reason: 'no backend' };
  try {
    const { data, error } = await sb.functions.invoke('verify-org-member');
    if (error) {
      let detail = '';
      try {
        detail = ((await (error as any).context?.json?.()) ?? {}).error ?? '';
      } catch {
        /* no JSON body */
      }
      return {
        verdict: 'unverifiable',
        reason: `verification service error${detail ? ` — "${detail}"` : ''}`,
      };
    }
    return {
      verdict: (data as any)?.member === true ? 'member' : 'notmember',
      reason: `GitHub reports state: ${(data as any)?.state ?? 'unknown'}`,
    };
  } catch (e: any) {
    return {
      verdict: 'unverifiable',
      reason: `couldn't reach verification service (${e?.message ?? e})`,
    };
  }
}

export const PROFILE_SELECT =
  'id, public_id, full_name, graduation_year, github_username, bio, avatar_url, avatar_color, resume_url, is_published, person_fields(field_id)';

export function mapProfile(d: any): MyProfile {
  return {
    id: d.id,
    publicId: d.public_id,
    fullName: d.full_name,
    gradYear: d.graduation_year,
    githubUsername: d.github_username,
    bio: d.bio ?? '',
    avatarUrl: d.avatar_url,
    avatarColor: d.avatar_color,
    resumeUrl: d.resume_url,
    isPublished: d.is_published,
    fieldIds: (d.person_fields ?? []).map((r: any) => r.field_id),
  };
}

/** The signed-in member's own profile row (by user_id), or null if none yet. */
export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('people')
      .select(PROFILE_SELECT)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return mapProfile(data);
  } catch {
    return null;
  }
}

/**
 * Permanently delete the signed-in member's account. Purges storage first (SQL
 * can't remove storage objects — migration 0003), then the RPC erases the person
 * row + tags + memberships + solo projects + the auth user, then signs out
 * locally (the server session is already gone). Returns an error message or null.
 */
export async function deleteMyAccount(userId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'no backend';
  await purgeMyStorage(userId);
  try {
    const { error } = await sb.rpc('delete_my_account');
    if (error) {
      console.error('ideaLab: delete_my_account failed', error);
      return error.message;
    }
  } catch (e: any) {
    return e?.message ?? 'delete failed';
  }
  await signOutLocal();
  return null;
}

/** Mint the minimal person row on a verified first login. RLS requires org
 *  membership; the verify-org-member call above has already recorded it. */
export async function createMinimalProfile(u: AuthUser): Promise<MyProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('people')
      .insert({
        user_id: u.userId,
        full_name: u.name || u.githubLogin || 'New Maker',
        github_username: u.githubLogin || null,
        avatar_url: u.avatarUrl || null,
      })
      .select(PROFILE_SELECT)
      .single();
    if (error || !data) {
      if (error) console.error('ideaLab: minimal profile insert failed', error);
      return null;
    }
    return mapProfile(data);
  } catch (e) {
    console.error('ideaLab: minimal profile insert threw', e);
    return null;
  }
}
