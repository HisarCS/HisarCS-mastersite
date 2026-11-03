import { getSupabase } from '../supabase';

type Sb = NonNullable<ReturnType<typeof getSupabase>>;

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Run a Supabase write and normalize the result to an error message or null.
 * Every mutation in lib/data funnels through here — 'no backend' when the
 * client isn't configured, the PostgREST message on failure, null on success.
 */
export const write = async (
  op: (sb: Sb) => PromiseLike<{ error: any }>,
  opts: { fallback?: string; mapError?: (error: any) => string } = {},
): Promise<string | null> => {
  const sb = getSupabase();
  if (!sb) return 'no backend';
  try {
    const { error } = await op(sb);
    if (!error) return null;
    return opts.mapError?.(error) ?? error.message ?? opts.fallback ?? 'failed';
  } catch (e: any) {
    return e?.message ?? opts.fallback ?? 'failed';
  }
};

/** Run a Supabase list read; any failure (no backend, network, error) → []. */
export const readRows = async (
  op: (sb: Sb) => PromiseLike<{ data: any; error: any }>,
): Promise<any[]> => {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await op(sb);
    return error || !data ? [] : data;
  } catch {
    return [];
  }
};

/** Postgres unique-constraint violation (duplicate key / 23505). */
export const isUniqueViolation = (error: any): boolean =>
  /duplicate key|23505/.test(`${error?.message ?? ''} ${error?.code ?? ''}`);
