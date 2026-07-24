import { getSupabase } from '../supabase';
import type { Project } from '../domain/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** One project's full detail by public_id, or null if not found / no backend. */
export async function getProject(publicId: string): Promise<Project | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('projects')
    .select(
      `id, public_id, title, description, avatar_url, is_published,
       project_fields(fields(name)),
       project_members(role, people(public_id, full_name, avatar_color)),
       project_links(label, url, sort_order),
       project_files(id, storage_path, kind, caption, sort_order)`,
    )
    .eq('public_id', publicId)
    .single();
  if (error || !data) return null;
  const d = data as any;
  return {
    dbId: d.id,
    publicId: d.public_id,
    title: d.title,
    description: d.description ?? '',
    avatarUrl: d.avatar_url,
    published: d.is_published,
    fields: (d.project_fields ?? []).map((f: any) => f.fields?.name).filter(Boolean),
    members: (d.project_members ?? [])
      .filter((m: any) => m.people)
      .map((m: any) => ({
        publicId: m.people.public_id,
        name: m.people.full_name,
        role: m.role || 'Member',
        color: m.people.avatar_color,
      })),
    links: (d.project_links ?? [])
      .map((l: any) => ({ label: l.label, url: l.url, sortOrder: l.sort_order }))
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    files: (d.project_files ?? [])
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
