# Local debugging

Reliable ways to see what's actually happening locally — instead of guessing from
the browser's error text.

## Edge function logs (verify-org-member etc.)

Function `console.log`/`console.error` output goes to the edge-runtime container,
**not** the browser. Tail it:

```bash
npm run logs:edge          # follow, last 100 lines
npm run logs:edge -- 500   # follow, last 500 lines
```

Errors are emitted as one structured JSON line, e.g.:

```json
{
  "fn": "verify-org-member",
  "level": "error",
  "message": "permission denied for table org_members",
  "stack": "…"
}
```

The browser only ever shows the short `message`; the log line has the full cause
and stack. (Also viewable in Studio → **Logs → Edge Functions**.)

## Database (ad-hoc SQL)

Open a psql shell against the local DB:

```bash
npm run db:psql
```

Useful checks:

```sql
-- who can do what on a table (grants)
select grantee, privilege_type
  from information_schema.role_table_grants
 where table_name = 'org_members' order by 1;

-- is my membership roster row there?
select * from public.org_members;

-- my person row + auth link
select p.id, p.public_id, p.github_username, p.is_published
  from public.people p;
```

## Which env vars the edge runtime actually has

Names only (never print secret values):

```bash
docker exec "$(docker ps --format '{{.Names}}' | grep edge_runtime)" \
  env | grep -oE '^(SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|GH_APP_ID|GH_APP_INSTALLATION_ID|GH_APP_PRIVATE_KEY|ORG_LOGIN)=' | sort
```

Local function secrets are declared in `supabase/config.toml` under
`[edge_runtime.secrets]` and resolved from your shell env — so before
`npm run stack` you must load them:

```bash
set -a; source supabase/functions/.env; set +a
```

`supabase/functions/.env` is gitignored (it holds the GitHub App private key).
The key must be **real multi-line PEM**, not one line with `\n` escapes — verify:

```bash
grep -c -F '\n' supabase/functions/.env   # want 0
```

## Common errors → cause

| Error                                                                  | Cause / fix                                                                                                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Could not read package.json` (ENOENT)                                 | Running `npm …` outside the repo — `cd` into `HisarCS-mastersite/` first.                                                                                                       |
| OAuth page shows `{"message":"name resolution failed"}`                | The Auth container can't resolve `github.com` — Docker DNS/network. Restart Docker; if it persists, try `npx supabase stop && npx supabase start` (without the custom network). |
| `503 Service Temporarily Unavailable` on `/functions/v1/…`             | Edge worker down — usually running `supabase functions serve` on top of a running stack. Use `[edge_runtime.secrets]` + `npm run stack:reset` instead.                          |
| `verification service error — "missing GH_APP_INSTALLATION_ID"`        | GitHub App secrets not loaded — `set -a; source supabase/functions/.env; set +a` then `npm run stack:reset`.                                                                    |
| `permission denied for table org_members`                              | `service_role` lacks DML on a late-created table locally; fixed by the explicit grant in the schema — re-apply with `npm run stack:reset`.                                      |
| `verification service error — "[object Object]"`                       | Old build of the function — it now surfaces the real message. Hot-reloads; if stale, `npm run stack:reset`.                                                                     |
| `409 Conflict` / `duplicate key … people_user_id_key` on first sign-in | Benign `resolve()` race (`INITIAL_SESSION` + `SIGNED_IN`); the insert is idempotent and recovers. Reload the page — the row now exists and no insert is attempted.              |
