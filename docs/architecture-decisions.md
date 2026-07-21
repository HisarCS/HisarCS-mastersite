# Architecture Decision Records

Each ADR captures one significant, hard-to-reverse decision: the context that
forced it, the choice, and the consequences we accepted. They exist so a future
maintainer (or an acquirer's engineering team) can understand _why_ the system
is shaped the way it is without re-litigating settled questions.

Format: **Status** · **Context** · **Decision** · **Consequences**. Superseded
ADRs are kept, not deleted — the history is the point.

---

## ADR-0001 — Static frontend on GitHub Pages

**Status:** Accepted

**Context:** A school lab portfolio for ~120 people. Zero budget for servers or
ops. Contributors are students; the site must be trivially reproducible and
outlive any single maintainer.

**Decision:** Ship the frontend as plain static HTML/CSS/JS on GitHub Pages. No
server, no SSR, no build step (see ADR-0014).

**Consequences:** Free, zero-ops hosting; the deploy artifact is exactly the
source. No server-side rendering or secret-holding backend code — every dynamic
concern is delegated to Supabase. Constraints inherited: no HTTP response
headers (so CSP ships via `<meta>`), URLs limited to what Pages' static server
supports (see ADR-0012).

---

## ADR-0002 — Supabase Postgres with Row Level Security as the only security boundary

**Status:** Accepted

**Context:** A static frontend cannot be trusted with authorization — anything
shipped to the browser is public. We need auth, storage, and per-row access
control without writing/hosting a backend.

**Decision:** Use Supabase (Postgres + Auth + Storage). **All** access control
lives in the database as RLS policies and `SECURITY DEFINER` triggers. The
frontend holds only the public anon/publishable key; the database enforces every
rule regardless of what the client does.

**Consequences:** A buggy or malicious frontend cannot leak or corrupt data —
the boundary is the DB, not the UI. A future React/mobile client inherits the
same guarantees for free. Cost: authorization logic lives in SQL, which is less
familiar to contributors and must be tested at the DB layer (the e2e suite
asserts the RLS contract directly). The anon key in `config.js` is public _by
design_ — it grants nothing RLS doesn't allow.

---

## ADR-0003 — One consolidated migration until first production launch

**Status:** Accepted (revisit at launch)

**Context:** Pre-launch, the schema churned heavily (an `admins` table replaced
by an allowlist, `summary`→`description`, `slug`→`public_id`). A linear chain of
"add then undo" migrations makes the real schema unreadable.

**Decision:** Keep the entire schema in a single migration file and edit it in
place while nothing has shipped. The file describes the _intended end state_, not
its history.

**Consequences:** Anyone can read one file to know the schema. This decision
**expires the moment real data exists in production** — after launch, migrations
become additive, ordered, and never-edited-once-shipped. We are standing exactly
on that line; the next schema change after go-live starts the append-only era.

---

## ADR-0004 — Canonical `fields` table with junction tables, not tag arrays

**Status:** Accepted

**Context:** People and projects both carry discipline tags ("Robotics", "CS &
AI"). A tempting shortcut is a `text[]` column per table.

**Decision:** One canonical `fields` table (case-insensitive unique names) plus
`person_fields` / `project_fields` junction tables. `project_members` is a
sibling junction that additionally _is_ the permission system.

**Consequences:** Referential integrity (a tag assignment cannot reference a
nonexistent tag), atomic renames (one `UPDATE` updates every chip everywhere),
governed vocabulary (no per-typist spelling drift), and single-query reads via
PostgREST embedding. Read ergonomics are preserved by aggregating tags into a
`text[]` in the `people_directory` **view** — arrays as a read artifact,
relations as storage. Cost: three tables instead of a column; justified by the
invariants they enforce.

---

## ADR-0005 — Derived cohort, never stored

**Status:** Accepted

**Context:** Student vs alumni status changes for the whole lab every July.

**Decision:** Do not store a cohort flag. Derive `student`/`alumni` from
`graduation_year` against the current academic year (flips July 1, Europe/
Istanbul) in `current_academic_year()`, surfaced by the `people_directory` view.

**Consequences:** Zero yearly maintenance; the entire lab "graduates" atomically
and correctly. Adding mentors/staff later means one nullable override column and
a one-line view change, not a data migration.

---

## ADR-0006 — GitHub App auth with a client-side org gate (UX, not security)

**Status:** Accepted (server-side hardening on the roadmap)

**Context:** Signup must be limited to the HisarCS GitHub organization. Supabase
Auth drives an OAuth flow; org membership is read via the user's token.

**Decision:** Use a dedicated **GitHub App** (not the org's Supabase integration
app) as the auth provider, with "Organization → Members: read" and org
installation. The membership check runs client-side; a non-member is signed out
immediately. The **real** gate is that admins publish profiles, so unverified
drafts are never visible.

**Consequences:** Works with no backend. Explicitly **not** a hard security
boundary — a determined non-member could POST a draft via the API (it stays
invisible). Hardening path documented: a Supabase Edge Function that verifies
membership with a GitHub App _installation_ token. Accepted the client-gate for
launch because the curation gate is the true control.

---

## ADR-0007 — Name-derived, stored `public_id` for URLs

**Status:** Accepted (supersedes a UUID-in-URL and a computed-live proposal)

**Context:** URLs need a stable, unique, readable key. Candidates: the UUID PK
(opaque), a value computed live from `full_name` (collisions + breaks on
rename), or a stored slug.

**Decision:** Store a `public_id` generated from the name at insert
(`Mert Karakaş → mert-karakas`, Turkish-aware, de-duplicated with `-2`). It is
stable across name changes and independent of the UUID PK. URLs are
`?id=<public_id>`.

**Consequences:** Readable, shareable, collision-free, rename-safe URLs. The name
appears in URLs (and thus history/logs) — judged acceptable because profiles are
public by design; obscuring the URL would add no security (ADR-0002). Column
named `public_id` (not "slug") per the owner's preference.

---

## ADR-0008 — Server-owned `github_username` (anti-spoof)

**Status:** Accepted

**Context:** The displayed GitHub handle must not be forgeable — a member could
otherwise point their profile link at someone else's account.

**Decision:** A trigger overwrites `github_username` with the real login from the
OAuth token on every linked insert/update. It is a display cache, never an auth
source (authz reads the token directly via `is_admin()`).

**Consequences:** The handle is unspoofable for linked members and self-corrects
on login. Unlinked (admin-created) profiles keep an admin-set value until their
owner signs in. Members cannot edit it.

---

## ADR-0009 — Honest states in production; never fabricate content

**Status:** Accepted

**Context:** Mock/demo data is useful for local development but must never masquerade
as real content on the live site.

**Decision:** Mock data exists **only** in local mode. In production: an empty
lab renders the `.)` mark in ink only; a missing profile/project shows an honest
"unavailable" card; a failed boot shows a diagnostic card naming the cause. All
carry a build stamp.

**Consequences:** The deployed site never lies about having data. Failures are
legible on any device without DevTools. The demo/prototype UI is structurally
impossible to render in production.

---

## ADR-0010 — Environment by hostname: private ⇒ local, public ⇒ production

**Status:** Accepted (supersedes "non-localhost ⇒ production")

**Context:** The earlier rule ("anything not localhost ⇒ production") meant
opening the local dev server via a LAN IP silently hit the **production**
database — a real footgun.

**Decision:** Classify _all_ local/private hostnames as local (localhost,
127.0.0.1, ::1, bare names, `*.local`, `10./192.168./172.16-31.` ranges,
`file://`). Only a genuinely public host is production.

**Consequences:** Local development can never accidentally touch production,
however the dev server is reached. Pure hostname logic, no hard-coded IPs,
identical on any OS. Trade-off: production behavior cannot be previewed via the
local server — use the deployed URL.

---

## ADR-0011 — Vendored supabase-js, no third-party CDN at runtime

**Status:** Accepted

**Context:** Loading the client from `cdn.jsdelivr.net` created a single point of
failure (networks that filter CDNs broke the whole site) and disclosed every
visitor's IP to a third party.

**Decision:** Vendor `supabase-js` into `vendor/supabase.js`, served same-origin.
A two-CDN `document.write` fallback covers the rare case the same-origin copy is
missing.

**Consequences:** If Pages can serve the site, the library loads — no external
dependency to block. Zero third-party requests on load (a privacy improvement).
Cost: the vendored file is updated manually on version bumps.

---

## ADR-0012 — Extensionless URLs via the static server's clean-URL support

**Status:** Accepted

**Context:** Want `/person?id=…` rather than `/person.html?id=…`, on a static host
with no rewrite engine.

**Decision:** Rely on GitHub Pages serving `/person` → `person.html` natively;
match it locally with `serve`'s `cleanUrls`. Files keep `.html` names on disk;
links are extensionless.

**Consequences:** Clean URLs with no `404.html` router hack and no folder
restructuring. The query string is preserved because we never link to the
`.html` form (whose clean-URL redirect would strip it). Local and prod behave
identically.

---

## ADR-0013 — Client-side image optimization and thumbnails

**Status:** Accepted

**Context:** Free-tier storage (1 GB) and egress (~5 GB/mo) must cover ~120
people and their projects for years, without degrading visible quality.

**Decision:** Optimize images in the browser before upload (stepped high-quality
downscale, JPEG q0.85) and generate a 128px avatar thumbnail for the homepage
grid. PDFs upload untouched. Requirements (types, size caps) live in one shared
`IDEALAB_UPLOADS` object.

**Consequences:** A 5 MB phone photo becomes ~200 KB with no visible loss at
display size; a cold homepage drops from ~18 MB to ~2 MB. Storage lasts years on
the free tier. Optimization runs on the client (no server), so it depends on
canvas APIs.

---

## ADR-0014 — No build step; types via JSDoc + `tsc --checkJs`, native ES modules

**Status:** Accepted

**Context:** The engineering-quality refactor needs type safety, a module system,
shared code, and unit tests. The default reach is TypeScript + a bundler (Vite),
producing a `dist/` build.

**Decision:** Keep the site **buildless**. Author in native ES modules; add types
with JSDoc annotations checked by `tsc --checkJs --noEmit`; test pure functions
with Vitest; enforce with ESLint/Prettier in CI. No bundler, no emitted build
artifact — the deployed files remain the authored files.

**Consequences:** Preserves the reproducibility and simplicity of ADR-0001/0002
(the deploy artifact is the source) while gaining compile-time type checking,
modules, shared/tested code, and quality gates. Caught bug class: column/shape
mismatches (`slug`→`public_id`, the ambiguous `fields` embed) become type errors.
Trade-off: JSDoc is more verbose than `.ts` for complex generics, and there's no
tree-shaking/minification — both judged negligible at this size. Migration path
to `.ts`+Vite later is trivial because the code is already modular; this ADR
would then be superseded.

---

## ADR-0015 — Full account erasure includes storage (GDPR/KVKK)

**Status:** Accepted

**Context:** Members are largely minors; the site is subject to GDPR and KVKK.
The right to erasure must be complete, not partial.

**Decision:** `delete_my_account()` removes the person row (cascading tags and
memberships; solo projects vanish via orphan cleanup), the member's avatar and
resume storage folders, and the `auth.users` login — in one call. Deleting a
project clears its storage folder via trigger.

**Consequences:** No orphaned personal data survives erasure anywhere in the
lifecycle. Complements the broader privacy posture (data minimization, EU
hosting, no third-party requests). Outstanding compliance items are policy, not
code: a privacy notice, the Supabase DPA, and parental-consent routing through
the school.
