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
