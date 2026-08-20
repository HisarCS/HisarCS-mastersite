import type { Page, Route } from '@playwright/test';

/**
 * Network-edge Supabase mock for the e2e suite.
 *
 * The app served on 127.0.0.1 resolves its backend to the LOCAL Supabase stack
 * (http://127.0.0.1:54321 — lib/env.ts). These helpers intercept that origin
 * inside the browser, so the suite exercises the real client code
 * (supabase-js, PostgREST query building, the functions client) against
 * deterministic responses — no Supabase stack, no GitHub, no network.
 *
 * Auth is seeded by writing a session into localStorage under the key
 * supabase-js derives from the backend URL (`sb-127-auth-token` for
 * 127.0.0.1) before any app script runs; supabase-js then recovers it exactly
 * as it would a real persisted login.
 */

export const SUPA = 'http://127.0.0.1:54321';
const STORAGE_KEY = 'sb-127-auth-token'; // sb-<hostname first label>-auth-token

export const USER_ID = '00000000-0000-4000-8000-000000000001';
export const GH_LOGIN = 'octomaker';

/** A `people` row shaped like PROFILE_SELECT (lib/data/auth.ts). */
export function profileRow(over: Record<string, unknown> = {}) {
  return {
    id: 'person-1',
    public_id: 'octo-maker',
    full_name: 'Octo Maker',
    graduation_year: 2027,
    github_username: GH_LOGIN,
    bio: 'Builds eight things at once.',
    avatar_url: null,
    avatar_color: '#2f6fe8',
    resume_url: null,
    is_published: false,
    person_fields: [],
    ...over,
  };
}

/** A `people_directory` row (homepage pixel grid / members index). */
export function directoryRow(over: Record<string, unknown> = {}) {
  return {
    id: 'dir-1',
    public_id: 'ada-lovelace',
    full_name: 'Ada Lovelace',
    cohort: 'student',
    graduation_year: 2027,
    avatar_url: null,
    avatar_color: '#e8542f',
    fields: ['Robotics'],
    ...over,
  };
}

/** A full public `people` row for the person page (getMember's select). */
export function personRow(over: Record<string, unknown> = {}) {
  return {
    public_id: 'ada-lovelace',
    full_name: 'Ada Lovelace',
    graduation_year: 2027,
    bio: 'First programmer, honorary maker.',
    avatar_url: null,
    avatar_color: '#e8542f',
    resume_url: null,
    github_username: 'adalovelace',
    fields: [{ name: 'Robotics' }, { name: 'CS & AI' }],
    research_members: [
      {
        role: 'member',
        research: { public_id: 'engine', title: 'Analytical Engine', is_published: true },
      },
    ],
    ...over,
  };
}

/** A published `research` row — carries both the card fields and the detail
 *  fields (getResearchEntry's select), so one helper serves list and lookup. */
export function researchEntryRow(over: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    public_id: 'sensor-garden',
    title: 'Sensor Garden',
    description: 'A courtyard garden that logs its own soil data.',
    avatar_url: null,
    venue: 'ideaLab',
    presented_on: '2026-05-01',
    is_published: true,
    external_authors: [],
    page: null,
    research_fields: [{ field_id: 1, fields: { name: 'Electronics' } }],
    research_members: [
      {
        role: 'lead',
        sort_order: 0,
        people: {
          id: 'person-1',
          public_id: 'octo-maker',
          full_name: 'Octo Maker',
          avatar_color: '#2f6fe8',
        },
      },
    ],
    research_links: [],
    research_files: [],
    ...over,
  };
}

export interface MockOptions {
  /** people_directory rows (homepage / members index). Default []. */
  directory?: unknown[];
  /** The signed-in member's own people row (null = no profile yet). */
  myProfile?: Record<string, unknown> | null;
  /** Public person row served for public_id lookups (null = not found). */
  person?: Record<string, unknown> | null;
  /** Published member research rows for the research index. Default []. */
  researchEntries?: unknown[];
  /** Full research row served for public_id lookups (entry page / editor). */
  researchEntry?: Record<string, unknown> | null;
  /** Rows for the fields table (onboarding/dashboard chips). Default []. */
  fields?: { id: number; name: string; created_by: string | null }[];
  /** verify-org-member response: a verdict, or an error status. */
  verify?: { member: boolean; state: string } | { status: number; error: string };
}

export interface SupabaseMock {
  /** Every intercepted backend request, in order (method + path + query). */
  requests: { method: string; path: string }[];
  /** How many non-preflight requests hit a path containing `part`. */
  calls(part: string): number;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

const fulfillJson = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

/** PostgREST's "0 rows" answer to a single-object request — what .single() /
 *  .maybeSingle() see when the row doesn't exist. */
const fulfillNoRows = (route: Route) =>
  fulfillJson(
    route,
    {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: 'Results contain 0 rows',
      hint: null,
    },
    406,
  );

/**
 * Seed a persisted GitHub session so the app boots signed in. Must be called
 * before page.goto (it registers an init script).
 */
export async function seedSession(
  page: Page,
  { login = GH_LOGIN, name = 'Octo Maker', userId = USER_ID } = {},
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'e2e-refresh-token',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${login}@users.noreply.github.com`,
      app_metadata: { provider: 'github', providers: ['github'] },
      user_metadata: {
        user_name: login,
        preferred_username: login,
        full_name: name,
        name,
        avatar_url: null,
      },
      created_at: '2026-01-01T00:00:00Z',
    },
  };
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key!, value!),
    [STORAGE_KEY, JSON.stringify(session)],
  );
}

/**
 * Intercept the whole mocked backend. Handles CORS preflights, PostgREST
 * single-object semantics, the verify-org-member edge function, storage
 * purges, and the account-deletion RPC. Stateful where the flows need it:
 * a POST/PATCH to `people` updates the row later GETs return, so multi-step
 * flows (create profile → onboarding → dashboard, publish → unpublish) work.
 */
export async function mockSupabase(page: Page, opts: MockOptions = {}): Promise<SupabaseMock> {
  const state = { myProfile: opts.myProfile ?? null };
  const requests: { method: string; path: string }[] = [];

  await page.route(`${SUPA}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    // browser CORS preflight — approve everything, don't log it
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    requests.push({ method, path: path + url.search });

    // ---- auth ----
    if (path.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204, headers: CORS });

    // ---- edge function: the org-membership gate ----
    if (path === '/functions/v1/verify-org-member') {
      const v = opts.verify ?? { member: true, state: 'active' };
      if ('status' in v) return fulfillJson(route, { error: v.error }, v.status);
      return fulfillJson(route, {
        login: GH_LOGIN,
        org: 'HisarCS',
        state: v.state,
        member: v.member,
      });
    }

    // ---- storage (danger-zone purge) ----
    if (path.startsWith('/storage/v1/object/list/')) return fulfillJson(route, []);
    if (path.startsWith('/storage/v1/object/')) return fulfillJson(route, { message: 'ok' });

    // ---- rpcs ----
    if (path === '/rest/v1/rpc/delete_my_account')
      return route.fulfill({ status: 204, headers: CORS });
    if (path === '/rest/v1/rpc/is_public_id_available') return fulfillJson(route, true);

    // ---- tables ----
    if (path === '/rest/v1/people_directory') return fulfillJson(route, opts.directory ?? []);

    if (path === '/rest/v1/fields') {
      if (method === 'GET') return fulfillJson(route, opts.fields ?? []);
      const body = (req.postDataJSON() ?? {}) as { name?: string };
      return fulfillJson(
        route,
        { id: 999, name: body.name ?? 'New Field', created_by: USER_ID },
        201,
      );
    }

    if (path === '/rest/v1/people') {
      const q = url.searchParams;
      if (method === 'GET' && (q.get('user_id') ?? '').startsWith('eq.')) {
        return state.myProfile ? fulfillJson(route, state.myProfile) : fulfillNoRows(route);
      }
      if (method === 'GET' && (q.get('public_id') ?? '').startsWith('eq.')) {
        return opts.person ? fulfillJson(route, opts.person) : fulfillNoRows(route);
      }
      if (method === 'POST') {
        // createMinimalProfile — a fresh row with no graduation year yet
        const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
        state.myProfile = profileRow({
          full_name: body.full_name ?? 'New Maker',
          github_username: body.github_username ?? null,
          avatar_url: body.avatar_url ?? null,
          graduation_year: null,
        });
        return fulfillJson(route, state.myProfile, 201);
      }
      if (method === 'PATCH') {
        // onboarding / profile save / publish — merge like the DB would
        const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
        state.myProfile = { ...(state.myProfile ?? profileRow()), ...body };
        return fulfillJson(route, state.myProfile);
      }
    }

    if (path === '/rest/v1/person_fields')
      return fulfillJson(route, [], method === 'POST' ? 201 : 200);

    if (path === '/rest/v1/research' && method === 'GET') {
      if ((url.searchParams.get('public_id') ?? '').startsWith('eq.')) {
        return opts.researchEntry ? fulfillJson(route, opts.researchEntry) : fulfillNoRows(route);
      }
      return fulfillJson(route, opts.researchEntries ?? []);
    }

    // anything unmocked answers an empty list — visible in `requests` when a
    // test needs to notice a call it didn't expect
    return fulfillJson(route, []);
  });

  return {
    requests,
    calls: (part: string) => requests.filter((r) => r.path.includes(part)).length,
  };
}
