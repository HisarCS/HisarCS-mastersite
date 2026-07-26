import { getSupabase } from '../supabase';
import type { ResearchEntry, ResearchEntryCard } from '../domain/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Member-created research entries (the DB-backed feature formerly called
// "projects"). Curated editorial research lives in ./research.ts.

/** All published research entries. Empty on no backend. */
export async function listResearchEntries(): Promise<ResearchEntryCard[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let data: any, error: any;
  try {
    ({ data, error } = await sb
      .from('research')
      .select('id, public_id, title, avatar_url')
      .eq('is_published', true));
  } catch {
    return [];
  }
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    publicId: r.public_id,
    title: r.title,
    avatarUrl: r.avatar_url,
  }));
}

/** Public URL for a file in the research-files bucket ('#' with no backend). */
export function researchFileUrl(storagePath: string): string {
  const sb = getSupabase();
  return sb ? sb.storage.from('research-files').getPublicUrl(storagePath).data.publicUrl : '#';
}

/** One research entry's full detail by public_id, or null if not found / no backend. */
export async function getResearchEntry(publicId: string): Promise<ResearchEntry | null> {
  const sb = getSupabase();
  if (!sb) return null;
  let data: any, error: any;
  try {
    ({ data, error } = await sb
      .from('research')
      .select(
        `id, public_id, title, description, avatar_url, is_published,
       research_fields(fields(name)),
       research_members(role, people(public_id, full_name, avatar_color)),
       research_links(label, url, sort_order),
       research_files(id, storage_path, kind, caption, sort_order)`,
      )
      .eq('public_id', publicId)
      .single());
  } catch {
    return null; // network/backend unreachable → honest fallback
  }
  if (error || !data) return null;
  const d = data as any;
  return {
    dbId: d.id,
    publicId: d.public_id,
    title: d.title,
    description: d.description ?? '',
    avatarUrl: d.avatar_url,
    published: d.is_published,
    fields: (d.research_fields ?? []).map((f: any) => f.fields?.name).filter(Boolean),
    members: (d.research_members ?? [])
      .filter((m: any) => m.people)
      .map((m: any) => ({
        publicId: m.people.public_id,
        name: m.people.full_name,
        role: m.role || 'Member',
        color: m.people.avatar_color,
      })),
    links: (d.research_links ?? [])
      .map((l: any) => ({ label: l.label, url: l.url, sortOrder: l.sort_order }))
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    files: (d.research_files ?? [])
      .map((f: any) => ({
        id: f.id,
        storagePath: f.storage_path,
        kind: f.kind,
        caption: f.caption,
        sortOrder: f.sort_order,
      }))
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
  };
}
