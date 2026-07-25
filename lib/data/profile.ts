import { getSupabase } from '../supabase';
import { mapProfile, PROFILE_SELECT } from './auth';
import { diffFieldIds } from '../domain/fields';
import type { Field, MyProfile } from '../domain/types';

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
