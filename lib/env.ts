/**
 * Environment — one codebase, two backends, chosen at RUNTIME by hostname.
 *
 * Ported from the original config.js (ADR-0010): local/private addresses use the
 * local Supabase CLI stack; a real public host uses production. Keeping the
 * choice at runtime (not baked at build) preserves the "same bundle everywhere,
 * can never silently hit prod from a dev machine" property even with a build
 * step — both anon keys are public-safe (RLS is the real boundary).
 */
export type Env = 'local' | 'production';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const ENVIRONMENTS: Record<Env, SupabaseConfig> = {
  local: {
    url: 'http://127.0.0.1:54321',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  },
  production: {
    url: 'https://orxqdmhanoqcwqsxxjbg.supabase.co',
    anonKey: 'sb_publishable_yTI2NY-P1kWNIMN7jIL8Qw_UGAmz_6f',
  },
};

/** True for localhost, a bare machine name, *.local, or a private-LAN IP. */
export function isLocalHost(h: string): boolean {
  return (
    h === '' || // file:// open
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h === '[::1]' ||
    h === '0.0.0.0' ||
    !h.includes('.') || // bare machine name
    h.endsWith('.local') || // mDNS / Bonjour
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)
  );
}

/** The active environment. On the server/build there is no location, so we
 *  report production; the real choice is made in the browser at runtime. */
export function currentEnv(): Env {
  if (typeof window === 'undefined') return 'production';
  return isLocalHost(window.location.hostname) ? 'local' : 'production';
}

export function supabaseConfig(): SupabaseConfig {
  return ENVIRONMENTS[currentEnv()];
}

/** Bump on deploys — proves which build a device is seeing. */
export const BUILD = '20260724-next';
