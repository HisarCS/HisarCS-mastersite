# Local development & testing

How to run the site locally and exercise every feature, including the
member/auth area. For diagnosing failures, see [local-debugging.md](./local-debugging.md).

> **Run every `npm …` command from the repo root** (`HisarCS-mastersite/`). A new
> terminal starts in your home dir — `cd` in first, or you'll get
> `Could not read package.json`.

---

## Requirements & dependencies

| Need                    | Why                                      | Notes                                                                                               |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Node.js 20+** and npm | build + tooling                          | v20/22/24 all fine                                                                                  |
| **Docker** running      | the local Supabase stack                 | Docker Desktop, OrbStack, or Colima                                                                 |
| repo deps               | Next, Supabase CLI, vitest…              | `npm install` — the Supabase CLI is a dev dependency, used via `npx supabase`, so no global install |
| **A GitHub App**        | _only_ for the member/auth area (Tier 2) | one App provides both sign-in and org-verification creds — see Tier 2                               |

Nothing is installed globally. Secrets live in a gitignored `supabase/functions/.env`.

---

## One-time setup

```bash
git clone <repo> && cd HisarCS-mastersite
npm install
```

Ensure Docker is running (`docker ps` should succeed).

---

## Tier 1 — UI, read-only pages, data layer (no auth)

Covers the homepage pixel mark, Members/Projects carousels + detail modal, deep
links, and the `/person?id=` / `/project?id=` pages against seeded data.

```bash
npm run stack     # start local Supabase (applies migrations + seed.sql)
npm run dev       # Next dev server → http://localhost:3000
```

- Studio (DB/Storage/Auth UI): **http://127.0.0.1:54323**
- Reset DB to seed state: `npm run stack:reset` · Stop: `npm run stack:down`

No GitHub sign-in is required for any of this.

---

## Tier 2 — Member area (auth, dashboard, uploads, delete)

This needs a **GitHub App**, used two ways:

| Mechanism                                              | Credential                                                      | Loaded as                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------- |
| **Sign-in** (OAuth user flow)                          | App **Client ID** + a generated **client secret**               | `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID` / `_SECRET`         |
| **Org verification** (edge function, server-to-server) | App **App ID** + **Installation ID** + **private key** (`.pem`) | `GH_APP_ID` / `GH_APP_INSTALLATION_ID` / `GH_APP_PRIVATE_KEY` |

`config.toml` already wires both from the shell env
(`[auth.external.github]` and `[edge_runtime.secrets]`).

### Configure the GitHub App (once)

1. The App's **Callback URL** must include `http://127.0.0.1:54321/auth/v1/callback`.
2. App → General → **Client secrets → Generate** (this is the _sign-in_ secret).
3. Note the **App ID** and **Installation ID** (the number in the install URL:
   `…/settings/installations/<INSTALLATION_ID>`), and have the **private-key `.pem`**
   (App → General → Private keys → Generate if needed).

### Create `supabase/functions/.env` (gitignored)

Put all six values in one file. The private key must be **real multi-line PEM**,
not one line with `\n` escapes:

```dotenv
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=Iv23xxxxxxxx
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=xxxxxxxx
GH_APP_ID=123456
GH_APP_INSTALLATION_ID=12345678
ORG_LOGIN=HisarCS
GH_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...more lines...
-----END RSA PRIVATE KEY-----"
```

Verify the key is multi-line (want `0`): `grep -c -F '\n' supabase/functions/.env`

### Load secrets and start

Secrets must be in the shell **before** `npm run stack`, because `config.toml`
resolves them via `env(...)`:

```bash
set -a; source supabase/functions/.env; set +a
npm run stack:reset          # re-applies migrations with secrets available
npm run dev                  # in another terminal (cd into the repo first)
```

Sanity-check the runtime picked them up (names only, no values):

```bash
docker exec "$(docker ps --format '{{.Names}}' | grep edge_runtime)" \
  env | grep -oE '^(SUPABASE_SERVICE_ROLE_KEY|GH_APP_ID|GH_APP_INSTALLATION_ID|GH_APP_PRIVATE_KEY|ORG_LOGIN)=' | sort
```

Then sign in at **http://localhost:3000/member/**. If your GitHub account is in
the **HisarCS** org, verification writes your `org_members` row and you land on
onboarding.

> Env vars live in one shell session. New terminal → re-run the
> `set -a; source …; set +a` line before `npm run stack`.

### Option A vs Option B

- **Option A (full, recommended):** the flow above. The stack auto-serves the
  `verify-org-member` function; with the secrets loaded it does the real GitHub
  org check. **Do not** run `supabase functions serve` on top of a running stack —
  it causes `503`s. The `[edge_runtime.secrets]` mechanism is the supported path.
- **Option B (shortcut, no App-installation creds):** if you only want to reach
  the dashboard UI and skip installation-token setup, sign in once (you'll get a
  "couldn't verify" screen), then add your roster row by hand so `is_org_member()`
  passes:
  ```bash
  npm run db:psql
  ```
  ```sql
  insert into public.org_members (github_login) values ('your-github-login');  -- lowercase
  ```
  Reload `/member/`. Note: Option B still needs GitHub **sign-in** to work (it
  only skips the _installation_ creds), and it won't self-heal roster changes.

### Member-flow checklist (what to test)

Onboarding (name, grad year, interests) → dashboard: edit + **Save** →
**Publish** (your pixel appears on the homepage) → avatar (upload / use GitHub /
color / reset) → resume PDF upload ("View current" opens it) → **Delete account**
(confirm by typing your GitHub handle; verify the `people` row + `avatars`/`resumes`
objects are gone) → sign in again re-creates the profile.

---

## Command reference

| Command                                        | Does                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm install`                                  | install deps (incl. local Supabase CLI)                                       |
| `npm run stack` / `stack:down` / `stack:reset` | start / stop / reset local Supabase                                           |
| `npm run dev`                                  | Next dev server (http://localhost:3000)                                       |
| `npm run build`                                | static export to `out/` (needs `NEXT_PUBLIC_BASE_PATH` for a sub-path deploy) |
| `npm run check`                                | format + lint + typecheck + unit tests                                        |
| `npm run test:unit`                            | vitest unit suite                                                             |
| `npm run lint` / `typecheck`                   | ESLint / `tsc --noEmit`                                                       |
| `npm run logs:edge`                            | tail edge-function logs (`-- 500` for more lines)                             |
| `npm run db:psql`                              | psql shell on the local DB                                                    |
| `npx supabase status`                          | show local stack URLs/keys                                                    |

---

## Platform notes (macOS / Linux / Windows)

The commands above are written for **bash/zsh** (macOS and Linux work as-is).

- **Docker runtime:** macOS → Docker Desktop, OrbStack, or Colima. Linux → Docker
  Engine (or Desktop). Windows → Docker Desktop with the **WSL2** backend.
- **Shell scripts:** `npm run logs:edge` runs `bash scripts/edge-logs.sh`, and
  `db:psql` uses a `$(…)` subshell — both require a POSIX shell.
- **Env loading:** `set -a; source … ; set +a` and multi-line PEM values are
  bash/zsh features.

**Windows:** use **WSL2 (Ubuntu)** and follow the Linux steps inside it — the bash
scripts, `source`, `$(…)`, and multi-line env values all work there, and Docker
Desktop's WSL2 integration exposes the stack on the same `127.0.0.1` ports. Native
PowerShell/cmd is not recommended here: npm runs scripts via `cmd.exe`, which
breaks the `$(…)` in `db:psql` and can't `source` the multi-line key. (A future
docs pass may add first-class PowerShell equivalents.)

---

## Troubleshooting

Common local errors and their causes are tabulated in
[local-debugging.md](./local-debugging.md) — including "name resolution failed"
(Docker DNS), "missing GH_APP_*" (secrets not loaded), `503` (don't run
`functions serve` over the stack), "permission denied for table org_members"
(`service_role` grant — fixed in the schema), and the harmless `409` on first
sign-in (a benign `resolve()` race; a page reload clears it).
