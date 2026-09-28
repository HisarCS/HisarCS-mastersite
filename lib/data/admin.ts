import { getSupabase } from '../supabase';
import { setPublished } from './profile';
import { setResearchPublished } from './researchEntries';

/**
 * Admin-panel data. Every call is gated by the database (RLS + is_admin(),
 * which reads the GitHub login from the auth token) — the panel only offers
 * what an admin's session is allowed to do. Writes return an error message
 * or null, like the rest of the data layer.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Is the signed-in user on the admin allowlist? (false on any failure) */
export async function isAdmin(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { data, error } = await sb.rpc('is_admin');
    return !error && data === true;
  } catch {
    return false;
  }
}

export interface QueuedPerson {
  id: string;
  publicId: string;
  name: string;
  gradYear: number | null;
}
export interface QueuedResearch {
  id: string;
  publicId: string;
  title: string;
}

/** Unpublished profiles and research drafts (admins can read every row). */
export async function listPublishQueue(): Promise<{
  people: QueuedPerson[];
  research: QueuedResearch[];
} | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const [p, r] = await Promise.all([
      sb
        .from('people')
        .select('id, public_id, full_name, graduation_year')
        .eq('is_published', false)
        .order('full_name'),
      sb.from('research').select('id, public_id, title').eq('is_published', false).order('title'),
    ]);
    if (p.error || r.error) return null;
    return {
      people: (p.data ?? []).map((x: any) => ({
        id: x.id,
        publicId: x.public_id,
        name: x.full_name,
        gradYear: x.graduation_year ?? null,
      })),
      research: (r.data ?? []).map((x: any) => ({
        id: x.id,
        publicId: x.public_id,
        title: x.title,
      })),
    };
  } catch {
    return null;
  }
}

export const publishPerson = async (id: string) => (await setPublished(id, true)).error;
export const publishResearch = (id: string) => setResearchPublished(id, true);

/** The admin allowlist, oldest first. */
export async function listAdmins(): Promise<string[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('admin_github_logins')
      .select('github_login')
      .order('added_at');
    return error ? null : (data ?? []).map((r: any) => r.github_login as string);
  } catch {
    return null;
  }
}

const write = async (
  op: (sb: NonNullable<ReturnType<typeof getSupabase>>) => PromiseLike<{ error: any }>,
) => {
  const sb = getSupabase();
  if (!sb) return 'no backend';
  try {
    const { error } = await op(sb);
    return error?.message ?? null;
  } catch (e: any) {
    return e?.message ?? 'failed';
  }
};

export const addAdmin = (login: string) =>
  write((sb) => sb.from('admin_github_logins').insert({ github_login: login }));
export const removeAdmin = (login: string) =>
  write((sb) => sb.from('admin_github_logins').delete().eq('github_login', login));

export interface AreaRow {
  area: string;
  tag: string;
  sort: number;
}

export async function listAreaRows(): Promise<AreaRow[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('interest_areas').select('area, tag, sort');
    return error ? null : ((data ?? []) as AreaRow[]);
  } catch {
    return null;
  }
}

export const addAreaTag = (row: AreaRow) => write((sb) => sb.from('interest_areas').insert(row));
export const removeAreaTag = (area: string, tag: string) =>
  write((sb) => sb.from('interest_areas').delete().eq('area', area).eq('tag', tag));
export const moveAreaTag = (tag: string, from: string, to: string, sort: number) =>
  write((sb) =>
    sb.from('interest_areas').update({ area: to, sort }).eq('area', from).eq('tag', tag),
  );
export const renameArea = (from: string, to: string) =>
  write((sb) => sb.from('interest_areas').update({ area: to }).eq('area', from));
