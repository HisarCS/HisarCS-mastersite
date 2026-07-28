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
immediately.

**Consequences:** Works with no backend. Explicitly **not** a hard security
boundary — a determined non-member could POST a draft via the API. This was
originally acceptable because admins published profiles (an unverified draft was
never publicly visible); **ADR-0016 removed that gate**, which briefly made the
client-side check the only barrier — until **ADR-0017 moved it server-side** (a
Supabase Edge Function that verifies membership with a GitHub App _installation_
token and writes the RLS-enforced `org_members` roster). The client check is now
advisory UX only.

**Setup gotchas (learned in production):** two failures cost real debugging time
and are worth recording. (1) A **client-secret mismatch** in Supabase's provider
config surfaces as the opaque GoTrue error `unexpected_failure: Unable to
exchange external code` — re-generate the secret and re-paste it. (2) Creating
the GitHub App is **not** enough: it must be **installed on the org**, or the
user token gets `403 Resource not accessible by integration` on
`GET /user/memberships/orgs/{org}` and the membership check can never resolve.
`member.html` now records the exact cause (no token / 403 / 404) to the console
and the "couldn't verify" page.

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

**Status:** Superseded by the Next.js migration — `@supabase/supabase-js` is now
an npm dependency bundled into the static export, which preserves the intent
(no third-party CDN at runtime, everything served same-origin).

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

**Status:** Superseded by the Next.js migration — routes are directory-style
(`trailingSlash: true`, e.g. `/person/?id=…`) emitted by `output: 'export'`.
The outcome is the same: no `.html` in URLs, `?id=` query routing preserved.

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

**Status:** Superseded by the Next.js migration — the site now has a build step
(`next build` → static `out/`) and real TypeScript. The type-safety goal stands;
the means changed once a framework was adopted.

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

---

## ADR-0016 — Members publish their own profiles (admin gate removed)

**Status:** Accepted 2026-07-21 (supersedes the admin-publish gate in ADR-0006)

**Context:** Profiles started as drafts that only an admin could publish — a
curation step, and in practice the system's real barrier to public visibility.
It also made every new member wait on an admin before their pixel appeared,
which does not fit a lab where anyone in the HisarCS org is legitimately a
member.

**Decision:** Anyone signed in may publish and unpublish their **own** profile.
The `guard_people_update` trigger no longer protects `is_published` (it still
protects `user_id`, the login link). The `people_published_needs_year` CHECK
still refuses to publish a profile with no graduation year. Delivered in the
consolidated schema migration `20260711000001_schema.sql`.

**Consequences:** Members are self-serve — no admin bottleneck. But this
**removes the system's last server-side barrier to public visibility**, and that
trade must be stated plainly: org membership is checked only in the browser
(ADR-0006), so a determined non-member who calls the API directly with the
public anon key can now create _and publish_ a profile that appears on the
homepage. Previously that draft would have stayed invisible.

Mitigations in force: admins can unpublish or delete any profile, and every
profile is attributable to a GitHub login. The server-side gate this ADR called
for has since been built — **see ADR-0017**, which makes membership a fact the
database enforces, so the browser check is no longer the only barrier.

---

## ADR-0017 — Server-enforced HisarCS org membership

**Status:** Accepted 2026-07-24 (closes the open hardening item in ADR-0016;
promotes the client-side gate of ADR-0006 to a real boundary)

**Context:** ADR-0006 checked org membership only in the browser, and ADR-0016
removed the admin-publish gate — so the browser check became the _only_ thing
between any GitHub account on earth and a published profile on the public
homepage. Supabase issues a valid session to anyone who completes GitHub
sign-in, member or not, and RLS cannot ask GitHub anything: a policy is a
synchronous SQL expression, and org membership is a fact that lives at GitHub.
The database simply could not know it.

**Decision:** Make membership a fact the database _does_ know, then gate on it.

- **`org_members`** — a roster table of verified GitHub logins, writable only by
  the service role (or admins). It carries a `verified_at` timestamp.
- **`is_org_member()`** — reads the caller's GitHub login from their auth token
  (unspoofable, exactly like `is_admin()`) and checks the roster. Admins always
  pass.
- **Every write policy requires it** — creating _or_ editing a profile (even an
  unpublished draft), interest tags, projects and their sub-resources, and all
  uploads. A non-member has read-only access and can create nothing; there is no
  "awaiting verification" state that can write. Reads and self-service deletes
  (leaving a project, erasing your own account/files) stay open.
- **`verify-org-member` Edge Function** populates the roster. It reads the caller
  from their JWT, asks GitHub with the app's own _installation_ token (not the
  member's ephemeral user token), and upserts or removes their row.

**The roster stays current without a scheduled job.** Verification is lazy: the
browser calls the function at signup (awaited — it needs the verdict) and again
as a fire-and-forget refresh on every returning-member page load. The function
self-throttles on `verified_at` (skips GitHub when confirmed within
`VERIFY_TTL_SECONDS`, default 15 min), so reloads are cheap. A member who leaves
the org is caught on their next visit and bounced; a member who leaves and never
returns is harmless, because their inert row grants nothing they exercise. This
was chosen over a daily cron, which polls everyone forever to catch the few who
are active _and_ gone — the members' own requests are a better trigger than a
timer. Existing members are grandfathered into the roster on deploy.

**Consequences:** The homepage is a real boundary again — the browser check is
now only advisory UX; RLS is the enforcement. The residual gap is narrow and
honestly bounded: a departed member with a still-valid session making _headless_
API calls (never loading the page) keeps write access until their next page
load — a strictly smaller window than the cron's, and RLS still attributes every
write to a GitHub login the whole time. The cost is a dependency on the GitHub
App's private key living as a Supabase secret, and one GitHub API call per
active-and-stale member. See §9 of the README for the deploy/secrets runbook.

---

## ADR-0018 — "Projects" and "Research" merged into one concept: Research

**Status:** Accepted 2026-07-26

**Context:** The site had grown two parallel concepts for the same underlying
thing — work produced in the lab:

- **Projects** — a DB-backed, member-created feature (`projects` + four child
  tables, `/project?id=`, a homepage carousel, a dashboard list). Fully built,
  but with almost no real content.
- **Research** — eight curated, editorial write-ups living as large standalone
  static HTML pages (`public/research.html` listing `public/research/<slug>.html`),
  outside the app entirely.

Two names for one idea meant two navigation entries, two data paths, and a
constant question of where a given piece of work belonged. The lab's own word
for its output is "research".

**Decision:** One user-facing concept, **Research**, with two content sources
behind it.

- **Curated research is static, in-app content.** `ResearchItem`
  (`lib/domain/types.ts`) gives the eight write-ups a real schema — authors
  (plain text _or_ linked to a site member), tags, start/end date, location, and
  resources — edited in `lib/data/research.ts`. The long-form bodies stay exactly
  as authored: `ResearchArticle` fetches the original HTML and injects its
  `<style>` + body into a **Shadow DOM**, so each write-up keeps its own layout,
  fully isolated from site styles. Zero content was rewritten or lost. Items may
  opt into a bespoke React layout via a `view` key resolved by a small registry.
- **The member-created feature was renamed, not retired.** Migration
  `20260726120000_rename_projects_to_research.sql` renames `projects` →
  `research`, the four child tables, their `project_id` → `research_id` columns,
  and the `project-files` storage bucket → `research-files`. `ALTER ... RENAME`
  carries FKs, indexes, triggers, and RLS policies automatically (they bind by
  object id); only function _bodies_ and the bucket-id _string_ name their
  targets textually, so those are recreated. Helper and policy **names** are
  deliberately unchanged (e.g. `is_project_editor`) — renaming them would force
  every dependent policy to be rebuilt for no functional gain, and they never
  surface in the UI.
- **`/research?id=<id>` resolves both**: a curated slug renders the write-up; any
  other id is looked up as a member-created entry. `/project?id=` remains as a
  deprecating redirect so existing links keep working.

**Browsing moved from a homepage mode to real pages.** The Members/Research
carousel was an in-place transformation of the homepage mark, which meant the
directories had no URLs of their own, cards opened a modal instead of a page,
and the header's contents changed depending on where you were (on `/member`,
"Members" simply did not exist). `/members` and `/research` are now ordinary
card-grid pages behind one shared `SiteHeader`; each card links to its own
detail page. The `.)` pixel mark remains the homepage as static art, its pixels
still linking to profiles. The carousel, detail modal, and FLIP motion code were
deleted.

**Consequences:** One concept, one nav entry, one detail route. Curated work
gains structured metadata without a migration or RLS exposure, and stays
editable by developers in one file. The DB rename is data-preserving but must be
deployed **together** with the frontend — the live site queries the new table
names, so `supabase db push` and the Pages deploy belong in the same window
(downtime is acceptable for this site). Storage's `protect_delete` forbids
deleting buckets from SQL, so the old empty `project-files` bucket is left
behind, policy-less and inert, to be removed via Studio. Two names now live in
the codebase — `research` (curated, static) and `researchEntries` (member,
DB-backed) — which is the one wrinkle this merge introduces.

---

## ADR-0019 — Research page bodies are Markdown documents

**Status:** Accepted 2026-07-28 (replaces the block system merged in PR #6 —
shipped and superseded within days, before any real content used it)

**Context:** Members compose the body of a research page themselves. Two
authoring models were built. First, a structured block editor (nine content-type
primitives in `research.page` jsonb) — sound for layout consistency, but each
capability students actually asked for (equations, data charts, images floated
inside running text) demanded another bespoke form, and form-per-block editing
was slower than writing. Markdown expresses all of it in one document, is a
transferable skill, and previews trivially.

**Decision:** `research.page` stores `{ version: 2, markdown }`. The dialect is
GitHub-flavored Markdown plus: KaTeX math (`$…$`, `$$…$$`), two fenced
mini-languages parsed by pure functions (` ```chart ` — which requires a
`question:` line that becomes the caption — and ` ```stats ` for stat chips),
and image placement via the image _title_ (`"left 40"`, `right`, `inset`,
`wide`; standalone image lines become captioned figures, adjacent images render
side by side). One renderer serves the public page and the editor preview. Raw
HTML is ignored; URLs are sanitized; nothing renders through `innerHTML`.
Malformed fences render an inline error, never silence.

**Consequences:** Authoring freedom with house styling — students control
content and order, never fonts or colors, and the design system survives a
redesign as a CSS change. The chart fence enforces the "a chart answers one
stated question" rule syntactically. Costs: ~130 KB gzipped added to research
routes (react-markdown + KaTeX, bundled same-origin per ADR-0011's intent), and
a markdown document is less machine-inspectable than blocks were. The v1 block
shape is read as null (its entries fall back to `description`; none existed in
production). `page.version` bumps only on breaking shape changes, paired with a
read-time migration in `lib/domain/page.ts`.

One clarification to the append-only migration rule (ADR-0003) came out of this
pivot: the applied migration that added the column
(`20260728090000_research_page_blocks.sql`) described the v1 block format in
its comments. **Comment-only corrections to applied migrations are allowed** —
comments never execute, so the file still matches what production ran — and
that comment has been corrected in place. The rule stays absolute for
executable SQL: never edit statements in an applied migration; ship a new one.
