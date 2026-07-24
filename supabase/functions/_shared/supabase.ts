// Supabase client factories for the edge functions. Centralises the env-var
// access and the two trust levels a function needs, so handlers never touch
// Deno.env or credentials directly.

import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';

const url = () => Deno.env.get('SUPABASE_URL')!;

// Service-role client — bypasses RLS. Use ONLY for trusted, server-side writes.
export const adminClient = (): SupabaseClient =>
  createClient(url(), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Resolve the caller from their JWT (forwarded via the Authorization header, so
// auth sees the real user — nothing in the request body is trusted). Returns
// null when the request is unauthenticated.
export async function getCaller(req: Request): Promise<User | null> {
  const client = createClient(url(), Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await client.auth.getUser();
  return user;
}

// A user's GitHub login (lowercased), or '' when no GitHub identity is linked.
export const githubLogin = (user: User): string =>
  (user.user_metadata?.user_name ?? user.user_metadata?.preferred_username ?? '')
    .toString()
    .toLowerCase();
