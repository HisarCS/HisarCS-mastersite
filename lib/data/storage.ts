import { getSupabase } from '../supabase';
import { checkFile, optimizeImage, UPLOAD_SPECS } from '../util/media';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Storage layer (4d). Avatars and resumes live in the `avatars`/`resumes`
 * buckets under `${userId}/…` at fixed paths (a new upload replaces the old),
 * with a `?v=` cache-buster so a year-long CDN cache still updates instantly.
 * Storage RLS gates writes on is_org_member() (ADR-0017). All fns no-op cleanly
 * without a backend so the UI degrades to a preview.
 */

export interface UploadResult {
  url: string | null;
  error: string | null;
}

const publicUrl = (sb: any, bucket: string, path: string) =>
  sb.storage.from(bucket).getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;

/**
 * Optimize (512px master + 128px homepage-grid twin) and upload an avatar, then
 * point people.avatar_url at the master. Clears no color — the URL wins over it.
 */
export async function uploadAvatar(
  userId: string,
  personId: string,
  file: File,
): Promise<UploadResult> {
  const bad = checkFile(file, UPLOAD_SPECS.avatar);
  if (bad) return { url: null, error: bad };
  const sb = getSupabase();
  if (!sb) return { url: null, error: 'no backend' };
  try {
    const big = await optimizeImage(file, UPLOAD_SPECS.avatar.maxDim!, { square: true });
    const thumb = await optimizeImage(file, 128, { square: true });
    const put = (p: string, blob: Blob) =>
      sb.storage
        .from('avatars')
        .upload(p, blob, { upsert: true, cacheControl: '31536000', contentType: 'image/jpeg' });
    let r = await put(`${userId}/avatar-512.jpg`, big);
    if (r.error) throw r.error;
    r = await put(`${userId}/avatar-128.jpg`, thumb);
    if (r.error) throw r.error;
    const url = publicUrl(sb, 'avatars', `${userId}/avatar-512.jpg`);
    const { error } = await sb.from('people').update({ avatar_url: url }).eq('id', personId);
    if (error) throw error;
    return { url, error: null };
  } catch (e: any) {
    return { url: null, error: e?.message ?? 'upload failed' };
  }
}

/** Upload a resume PDF to a fixed path and point people.resume_url at it. */
export async function uploadResume(
  userId: string,
  personId: string,
  file: File,
): Promise<UploadResult> {
  const bad = checkFile(file, UPLOAD_SPECS.resume);
  if (bad) return { url: null, error: bad };
  const sb = getSupabase();
  if (!sb) return { url: null, error: 'no backend' };
  try {
    const path = `${userId}/resume.pdf`;
    const { error: upErr } = await sb.storage
      .from('resumes')
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: 'application/pdf' });
    if (upErr) throw upErr;
    const url = publicUrl(sb, 'resumes', path);
    const { error } = await sb.from('people').update({ resume_url: url }).eq('id', personId);
    if (error) throw error;
    return { url, error: null };
  } catch (e: any) {
    return { url: null, error: e?.message ?? 'upload failed' };
  }
}

/**
 * Point people.avatar_url at an external image (the GitHub avatar). No upload —
 * the canonical source is the OAuth token's avatar_url, else github.com/<login>.png.
 */
export async function setAvatarUrl(personId: string, url: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'no backend';
  try {
    const { error } = await sb.from('people').update({ avatar_url: url }).eq('id', personId);
    return error?.message ?? null;
  } catch (e: any) {
    return e?.message ?? 'failed';
  }
}

/**
 * Delete everything under the user's storage prefix in both buckets. SQL can't
 * remove storage objects (migration 0003/0004), so account deletion (4e) calls
 * this from the client first. Best-effort: a failed bucket is logged, not fatal.
 */
export async function purgeMyStorage(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  for (const bucket of ['avatars', 'resumes']) {
    try {
      const { data } = await sb.storage.from(bucket).list(userId);
      const paths = (data ?? []).map((f: any) => `${userId}/${f.name}`);
      if (paths.length) await sb.storage.from(bucket).remove(paths);
    } catch (e) {
      console.warn(`ideaLab: could not purge ${bucket}`, e);
    }
  }
}

/**
 * Upload a research file (image or PDF) into `research-files/{researchId}/…`
 * and record it in `research_files`. Storage RLS keys off the first path
 * segment (`is_project_editor(researchId)`), so the folder name must be the
 * entry's id. Images are optimized client-side like avatars; PDFs upload as-is.
 */
export async function uploadResearchFile(
  researchId: string,
  file: File,
  sortOrder = 0,
): Promise<{ error: string | null }> {
  const isPdf = file.type === 'application/pdf';
  const spec = isPdf ? UPLOAD_SPECS.researchPdf : UPLOAD_SPECS.researchImage;
  const bad = checkFile(file, spec);
  if (bad) return { error: bad };
  const sb = getSupabase();
  if (!sb) return { error: 'no backend' };
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-60);
    const path = `${researchId}/${Date.now()}-${safeName}`;
    // maxDim only exists on the image spec, so reference it directly
    const body: Blob = isPdf
      ? file
      : await optimizeImage(file, UPLOAD_SPECS.researchImage.maxDim, {});
    const { error: upErr } = await sb.storage.from('research-files').upload(path, body, {
      upsert: false,
      cacheControl: '31536000',
      contentType: isPdf ? 'application/pdf' : 'image/jpeg',
    });
    if (upErr) throw upErr;
    const { error } = await sb.from('research_files').insert({
      research_id: researchId,
      storage_path: path,
      kind: isPdf ? 'pdf' : 'image',
      caption: file.name,
      sort_order: sortOrder,
    });
    if (error) throw error;
    return { error: null };
  } catch (e: any) {
    return { error: e?.message ?? 'upload failed' };
  }
}

/** Remove a research file: the storage object first, then its metadata row. */
export async function deleteResearchFile(
  fileId: string,
  storagePath: string,
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'no backend';
  try {
    await sb.storage.from('research-files').remove([storagePath]);
    const { error } = await sb.from('research_files').delete().eq('id', fileId);
    return error?.message ?? null;
  } catch (e: any) {
    return e?.message ?? 'could not remove file';
  }
}
