// ============================================================================
// verify-org-member — turns "signed in with GitHub" into "verified HisarCS
// member" by asking GitHub whether the caller is actually in the org, then
// syncing that caller's row in the public.org_members roster (which RLS gates
// every write on).
//
// The browser calls this:
//   • after sign-in, before creating a profile (awaited — needs the verdict)
//   • on every returning-member page load (fire-and-forget refresh)
//
// That second call is how the roster stays in sync with GitHub org changes
// WITHOUT a scheduled job: a member who leaves is caught on their next visit.
// To keep reloads from hammering GitHub, the check is throttled — if this login
// was confirmed within VERIFY_TTL_SECONDS, we trust the roster and skip GitHub.
// Someone who is inactive never needs checking; their stale row is inert because
// they aren't writing anything.
// ============================================================================

import { installationToken, ORG, orgMembershipState } from '../_shared/github.ts';
import { adminClient, getCaller, githubLogin } from '../_shared/supabase.ts';
import { json } from '../_shared/http.ts';

const TTL_MS = (Number(Deno.env.get('VERIFY_TTL_SECONDS')) || 900) * 1000; // default 15 min

Deno.serve(async (req) => {
  try {
    // 1. Who is calling? Trust the JWT, never the request body.
    const user = await getCaller(req);
    if (!user) return json({ error: 'not signed in' }, 401);
    const login = githubLogin(user);
    if (!login) return json({ error: 'no github login on this account' }, 400);

    const admin = adminClient();

    // 2. Throttle: if GitHub confirmed this login recently, trust the roster and
    //    skip the API call. A present, fresh row means "member".
    const { data: existing } = await admin.from('org_members')
      .select('verified_at').eq('github_login', login).maybeSingle();
    if (existing && Date.now() - new Date(existing.verified_at).getTime() < TTL_MS) {
      return json({ login, org: ORG, state: 'cached', member: true });
    }

    // 3. Stale or unknown → ask GitHub the truth.
    const state = await orgMembershipState(login, await installationToken());
    const isMember = state === 'active';

    // 4. Sync this caller's roster row (service role bypasses RLS).
    if (isMember) {
      const { error } = await admin.from('org_members')
        .upsert({ github_login: login, verified_at: new Date().toISOString() }, {
          onConflict: 'github_login',
        });
      if (error) throw error;
    } else {
      // left the org (or only pending) -> revoke write access
      const { error } = await admin.from('org_members').delete().eq('github_login', login);
      if (error) throw error;
    }

    return json({ login, org: ORG, state, member: isMember });
  } catch (e) {
    console.error('verify-org-member:', e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
