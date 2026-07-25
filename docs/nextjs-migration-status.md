# Next.js migration — status & resume guide

Working branch: **`nextjs-migration`** (do NOT merge to `main` until Phase 4 done;
`main` is the live static site + the deploy workflow trigger). Nothing pushed.

Commands: `npm run dev` (Next dev) · `npm run build` (needs `NEXT_PUBLIC_BASE_PATH=/HisarCS-mastersite`) ·
`npm run typecheck` · `npm run test:unit` (24 tests) · local Supabase: `npm run stack`.

## Done (committed)

- **Phase 0** `b0ca681` — Next 15 App Router, `output:'export'`, `basePath` from
  `NEXT_PUBLIC_BASE_PATH` (one env var; set in `.github/workflows/deploy.yml`),
  `app/globals.css` design tokens, GH Actions build→Pages.
- **Phase 1** `53da8fa` — framework-agnostic layers in `lib/`:
  - `env.ts` (runtime hostname local/prod switching — ADR-0010 preserved),
    `supabase.ts` (browser client singleton, null on server/no-backend),
    `util/{html,media,date,hash}.ts`, `domain/types.ts`,
    `data/{members,projects}.ts` (queries), `data/mock.ts`, `data/build.ts` (deleted in P2).
- **Phase 2** `55ae5da` — read-only pages, **query-param routing** (`/person?id=`,
  `/project?id=`): `app/person/page.tsx` + `PersonRoute` (Suspense→useSearchParams)
  → `PersonView`; same for project. `research.html` + `research/*` moved to
  `public/` (served as-is). Data fetches wrapped in try/catch (resilient).
- **Phase 3a** `31fe9c9` — homepage pixel mark: `lib/homepage/mark.ts` (PIXEL_MAP,
  grid, seeded layout — pure/testable), `components/PixelMark.tsx` (stage, pixels,
  hover card, resize), `components/Home.tsx` (shell: nav + fetch members + mark),
  `app/page.tsx`. Verified: avatars/shapes/fillers/nav/footer/hover card all work.

## Critical decisions & gotchas (don't re-derive)

1. **Routing is query-param, NOT path-based.** `output:export` + `dynamicParams:false`
   makes any un-enumerated id 404 AND breaks the build when a type has 0 published
   rows. Query-param = one static page, client-fetches any id. Do NOT reintroduce
   `[id]` dynamic routes.
2. **Data fetches MUST try/catch** — supabase-js rejects on unreachable backend;
   uncaught → stuck loading. Pattern is in `data/members.ts`/`projects.ts`.
3. **basePath**: served at `/HisarCS-mastersite` today (will move to root later —
   just change the env var). `public/` static links (research) need `BASE` prepended
   manually (`process.env.NEXT_PUBLIC_BASE_PATH`); Next `<Link>` handles it automatically.
4. **Homepage body scroll**: `Home.tsx` sets `document.body.style.overflow='hidden'`
   on mount, restores on unmount (full-screen stage).
5. **Edge function** (`verify-org-member`) already deployed with `verify_jwt=false`
   + CORS; unrelated to this branch's frontend.
6. Nav redesign (Research/One of Us next to wordmark, no arrows) is in `SiteHeader`
   (inner pages) and `Home` (homepage). Members/Projects toggles are Phase 3b.

## Remaining work

### Phase 3 (rest) — the carousel feature (the main ask)
- **3b + 3c DONE** (not yet committed at time of writing / see git log) — mode
  toggles (`Members`/`Projects`) in `Home` with `useState` mode + Esc-to-close;
  `listProjects()`/`mockProjects()` added; generic `components/Carousel.tsx`
  (cross-fade overlay, prev/next paging, responsive card width, cards → detail
  pages). Verified: Members carousel renders with avatars + name + cohort·field.
- **3d DONE** — `components/DetailModal.tsx`: card → inline modal over the dimmed
  carousel, renders `PersonView`/`ProjectView` with `embedded` (skips SiteHeader),
  prev/next through cards + close, keyboard (Esc/←/→) centralized in `Home`.
  Cards keep their `href` (accessibility) but open the modal on click. Verified.
- **3e DONE** — adaptive FLIP in `lib/homepage/motion.ts` (`pickTransition()`:
  `ANIMATION_MODE = adaptive|flip|crossfade`, capability = fine pointer + ≥900px +
  motion-ok). `Carousel` gets `flip` prop → cards fly in from their matching pixel
  (`data-pixel`/`data-card`) via Web Animations API; else the CSS cross-fade
  baseline. One-line revert = set ANIMATION_MODE='crossfade'. (Motion not
  screenshot-verifiable; end-state + build verified.)
- **3f DONE** — hash routing in `Home` (`#members` · `#members/<public_id>` ·
  `#projects/<public_id>`). pushState is silent so no sync loop; diff-check +
  skip-initial-render guard the edge cases; `pendingDetail` resolves a deep-linked
  id to a card index once items load. Verified: deep-link restore, hash updates on
  next/prev, browser back/forward.

**PHASE 3 COMPLETE.** The full carousel feature works end-to-end.

### Phase 4 — member area (auth) — LAST, riskiest (in progress)
- **4a DONE** — auth foundation: `lib/domain/memberState.ts` (`deriveMemberScreen`,
  the tested state-machine spec), `lib/data/auth.ts` (getAuthUser, onAuthChange,
  signInWithGitHub, signOutLocal `scope:'local'`, verifyOrgMembership invoke,
  getMyProfile, createMinimalProfile), `components/MemberArea.tsx` (state machine +
  signedout/verifying/notmember/verifyfail screens; onboarding/dashboard stubbed),
  `app/member/page.tsx`. Tests: `memberState.test.ts` + backfilled `mark.test.ts`
  (36 unit tests total). Signed-out screen verified in browser; auth flow needs a
  real GitHub session to exercise live.
**Where things are (resume map).** Old source is `member.html` (1178 lines; DO NOT
delete until Phase 4 done). Screens markup: signedout 159, verifyfail 176, notmember
199, onboarding 220-246, dashboard 249-405 (danger-zone/delete modal ~340-405). Script
function → line: `createMinimalProfile` 559 (ported), `loadFields` 628, `buildChips`
634, `makeChip` 672, `deleteField` 696, `makeAddChip` 719, `createProfile` 773,
`syncTags` 821, `fillDashboard` 831, `renderPublishState` 850, `setPublished` 858,
`renderAvatarTile` 881, `saveProfile` 898, `loadProjects` 929, avatar color swatch
click ~960, `uploadAvatar` 971, `uploadResume` 1007, `importGithubAvatar` 1034,
`resetToInitials` 1060, `checkYear` 1067, `checkSlug` 1086, `purgeMyStorage` 1112,
`tryDelete`/delete ~1140. **Read the specific range per sub-step; don't reload the
whole file.** New data fns go in `lib/data/profile.ts` (create it); UI in
`components/member/` sub-components rendered by `MemberArea` for screen==='onboarding'
/'dashboard'. `optimizeImage`/`checkFile`/`UPLOAD_SPECS` already in `lib/util/media.ts`.

- **4b — onboarding** (member.html 220-246 markup, 773-830 + 634-771 + 1067-1085 logic).
  Form: full name, graduation year (`checkYear` — 4 digits, ≥2008-ish, sets cohort),
  GitHub (locked, from login), interest chips. Chips = `fields` table (id,name,created_by);
  typing a new one is STAGED then created on submit with dedupe (`insert` →on-conflict
  `select ilike name`). `createProfile`: update people row (full_name, graduation_year),
  create staged fields, `syncTags` (person_fields insert/delete diff), then → dashboard.
  Add data fns: `updateMyProfile(id, {...})`, `listFields()`, `createField(name)`,
  `syncPersonFields(personId, fieldIds)`. Consider a unit test for the field-diff logic.
- **4c — dashboard** (member.html 249-339 markup, 831-928 + 960-970 logic). Draft
  banner + publish toggle (`setPublished` → people.update is_published; needs grad year;
  `people_published_needs_year` CHECK enforces). Edit name/bio/fields; save
  (`saveProfile` → people.update + syncTags). Avatar tile with 6 color swatches
  (people.avatar_color; picking a color clears avatar_url). Projects list (`loadProjects`
  → project_members→projects for this person; "new project" is a stub in the original).
  public_id edit uses `checkSlug` + RPC `is_public_id_available`.
- **4d — uploads** (member.html 971-1059). Avatar: `optimizeImage(file,512,{square:true})`
  + a 128 thumb → `avatars` bucket at `${userId}/avatar-512.jpg` & `avatar-128.jpg`
  (upsert, cacheControl 31536000, contentType image/jpeg) → people.update avatar_url
  (append `?v=Date.now()`). Resume: PDF → `resumes` bucket `${userId}/resume.pdf`
  (upsert) → people.update resume_url. `importGithubAvatar` (from session avatar_url),
  `resetToInitials` (clear avatar_url). Add `lib/data/storage.ts` (uploadAvatar,
  uploadResume, purgeMyStorage). NOTE storage RLS gates on `is_org_member()` (ADR-0017).
- **4e — delete account** (member.html 340-405 markup, 1112-1164). Danger zone → modal
  → confirm by typing GitHub handle (case-insensitive, tolerate leading @; use plain
  toLowerCase NOT Turkish locale — see the fix already made in old member.html). Flow:
  `purgeMyStorage()` (list+remove avatars/resumes — SQL can't delete storage, migration
  0003/0004) THEN `sb.rpc('delete_my_account')` THEN `signOutLocal()` → signedout.
  Reuse `signOutLocal` from `lib/data/auth.ts`.

After 4e: smoke-test the full member flow with a real GitHub session against the
deployed function, then do the final cleanup and merge to main.

### Final cleanup (after Phase 4)
- Delete old root HTML (`index/person/project/member.html`), `config.js`, `vendor/`,
  old `tests/unit/config.test.js`, `tests/e2e.spec.js` (or port e2e to Next).
- ESLint flat config for Next (`next lint` / eslint-config-next) — currently the
  `check` script skips lint; the deploy build only warns.
- Optionally unify `/research` pages' nav (currently their original nav; low value,
  340KB embedded-asset HTML).
- Then merge `nextjs-migration` → `main` (triggers the Pages deploy).
