import { getSupabase } from '../supabase';
import { mapProfile, PROFILE_SELECT } from './auth';
import { diffFieldIds } from '../domain/fields';
import type { Field, MyProfile, MyProjectSummary } from '../domain/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** All interest fields, alphabetical. */
export async function listFields(): Promise<Field[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('fields').select('id, name, created_by').order('name');
    if (error || !data) return [];
    return data.map((r: any) => ({ id: r.id, name: r.name, createdBy: r.created_by }));
  } catch {
    return [];
  }
}

/** Create a field (or return the existing one on a case-duplicate race, 23505). */
export async function createField(name: string): Promise<Field | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    let { data, error } = await sb
      .from('fields')
      .insert({ name })
      .select('id, name, created_by')
      .single();
    if (error && String((error as any).code) === '23505') {
      ({ data, error } = await sb
        .from('fields')
        .select('id, name, created_by')
        .ilike('name', name)
        .single());
    }
    if (!data) return null;
    return { id: (data as any).id, name: (data as any).name, createdBy: (data as any).created_by };
  } catch {
    return null;
  }
}

/** Delete a field you own — RLS refuses if anyone else uses it (empty result). */
export async function deleteField(id: number): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { data, error } = await sb.from('fields').delete().eq('id', id).select('id');
    return !error && !!data?.length;
  } catch {
    return false;
  }
}

/** Complete onboarding: set name + graduation year on the existing person row. */
export async function completeOnboarding(
  personId: string,
  fullName: string,
  gradYear: number,
): Promise<MyProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('people')
      .update({ full_name: fullName, graduation_year: gradYear })
      .eq('id', personId)
      .select(PROFILE_SELECT)
      .single();
    if (error || !data) return null;
    return mapProfile(data);
  } catch {
    return null;
  }
}

export interface ProfilePatch {
  fullName: string;
  bio: string;
  resumeUrl: string;
  publicId: string;
  gradYear: number;
}

/** Save the editable profile fields. github_username is server-owned (a trigger
 *  syncs it from the OAuth token) so it's never sent. */
export async function updateMyProfile(
  id: string,
  patch: ProfilePatch,
): Promise<{ profile: MyProfile | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { profile: null, error: 'no backend' };
  try {
    const { data, error } = await sb
      .from('people')
      .update({
        full_name: patch.fullName,
        bio: patch.bio || null,
        resume_url: patch.resumeUrl || null,
        public_id: patch.publicId,
        graduation_year: patch.gradYear,
      })
      .eq('id', id)
      .select(PROFILE_SELECT)
      .single();
    if (error) {
      const msg = /people_public_id_key|duplicate/.test(error.message)
        ? 'that profile URL is taken'
        : error.message;
      return { profile: null, error: msg };
    }
    return { profile: mapProfile(data), error: null };
  } catch (e: any) {
    return { profile: null, error: e?.message ?? 'save failed' };
  }
}

/** Publish / unpublish. The DB CHECK (people_published_needs_year) blocks
 *  publishing without a graduation year — callers should guard first for UX. */
export async function setPublished(
  id: string,
  next: boolean,
): Promise<{ profile: MyProfile | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { profile: null, error: 'no backend' };
  try {
    const { data, error } = await sb
      .from('people')
      .update({ is_published: next })
      .eq('id', id)
      .select(PROFILE_SELECT)
      .single();
    if (error) return { profile: null, error: error.message };
    return { profile: mapProfile(data), error: null };
  } catch (e: any) {
    return { profile: null, error: e?.message ?? 'failed' };
  }
}

/** Pick an initials-tile color (clears any uploaded avatar). */
export async function setAvatarColor(id: string, color: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb
      .from('people')
      .update({ avatar_url: null, avatar_color: color })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/** Is a profile URL slug free? (RPC is_public_id_available.) */
export async function isPublicIdAvailable(candidate: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { data, error } = await sb.rpc('is_public_id_available', { candidate });
    return !error && !!data;
  } catch {
    return false;
  }
}

/** Projects the member belongs to (dashboard list). */
export async function listMyProjects(personId: string): Promise<MyProjectSummary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('projects')
      .select('public_id, title, is_published, project_members!inner(person_id)')
      .eq('project_members.person_id', personId)
      .order('title');
    if (error || !data) return [];
    return data.map((p: any) => ({
      publicId: p.public_id,
      title: p.title,
      isPublished: p.is_published,
    }));
  } catch {
    return [];
  }
}

/** Reconcile person_fields to match `selected` (diff against `before`). */
export async function syncPersonFields(
  personId: string,
  before: number[],
  selected: number[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { toAdd, toRemove } = diffFieldIds(before, selected);
  try {
    if (toAdd.length) {
      await sb
        .from('person_fields')
        .insert(toAdd.map((field_id) => ({ person_id: personId, field_id })));
    }
    if (toRemove.length) {
      await sb.from('person_fields').delete().eq('person_id', personId).in('field_id', toRemove);
    }
  } catch (e) {
    console.error('ideaLab: syncPersonFields failed', e);
  }
}
