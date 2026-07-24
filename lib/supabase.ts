import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './env';

/**
 * Browser Supabase client (singleton). Reads are anon + RLS-gated; the member
 * area later uses the same client for auth (session persisted in localStorage).
 *
 * Returns null on the server/build (there is no window) and when no config is
 * present — callers then fall back to honest empty/unavailable states (ADR-0009)
 * rather than throwing.
 */
let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (cached) return cached;
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) return null;
  cached = createClient(url, anonKey);
  return cached;
}
