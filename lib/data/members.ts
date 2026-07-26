import { getSupabase } from '../supabase';
import { cohortFor } from '../util/date';
import type { Member, MemberCard } from '../domain/types';

/* Supabase's nested selects aren't statically typed without generated DB types,
   so raw rows are read loosely and mapped into clean domain models below. */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** All published members for the directory / pixel grid (people_directory view
 *  already scopes to published and computes cohort). Empty array on no backend. */
export async function listMembers(): Promise<MemberCard[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let data: any, error: any;
  try {
    ({ data, error } = await sb
      .from('people_directory')
      .select('id, public_id, full_name, cohort, avatar_url, avatar_color, fields'));
  } catch {
    return [];
  }
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    publicId: r.public_id,
    name: r.full_name,
    cohort: r.cohort as MemberCard['cohort'],
    avatarUrl: r.avatar_url,
    avatarColor: r.avatar_color,
    fields: (r.fields ?? []) as string[],
  }));
}

/** One member's full profile by public_id, or null if not found / no backend. */
export async function getMember(publicId: string): Promise<Member | null> {
  const sb = getSupabase();
  if (!sb) return null;
  let data: any, error: any;
  try {
    ({ data, error } = await sb
      .from('people')
      .select(
        `public_id, full_name, graduation_year, bio, avatar_url, avatar_color,
       resume_url, github_username, fields!person_fields(name),
       project_members(role, projects(public_id, title, is_published))`,
      )
      .eq('public_id', publicId)
      .single());
  } catch {
    return null; // network/backend unreachable → honest fallback
  }
  if (error || !data) return null;
  const d = data as any;
  return {
    publicId: d.public_id,
    name: d.full_name,
    gradYear: d.graduation_year,
    cohort: cohortFor(d.graduation_year),
    bio: d.bio ?? '',
    avatarUrl: d.avatar_url,
    avatarColor: d.avatar_color,
    resumeUrl: d.resume_url,
    githubUsername: d.github_username,
    fields: (d.fields ?? []).map((f: any) => f.name),
    projects: (d.project_members ?? [])
      .map((pm: any) => pm.projects)
      .filter((pr: any) => pr && pr.is_published) // RLS hides drafts; belt & suspenders
      .map((pr: any) => ({ publicId: pr.public_id, title: pr.title })),
  };
}
