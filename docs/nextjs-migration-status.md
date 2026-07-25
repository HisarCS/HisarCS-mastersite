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

### Phase 4 — member area (auth) — LAST, riskiest
- Port `member.html` (sign-in, onboarding, dashboard, edit profile/tags/projects,
  avatar/resume upload, delete account). Uses the org-gate flow already stabilized:
  `verify-org-member` invoke, `is_org_member` RLS, `signOut({scope:'local'})`.
  `optimizeImage`/`UPLOAD_SPECS`/`checkFile` already ported in `lib/util/media.ts`.

### Final cleanup (after Phase 4)
- Delete old root HTML (`index/person/project/member.html`), `config.js`, `vendor/`,
  old `tests/unit/config.test.js`, `tests/e2e.spec.js` (or port e2e to Next).
- ESLint flat config for Next (`next lint` / eslint-config-next) — currently the
  `check` script skips lint; the deploy build only warns.
- Optionally unify `/research` pages' nav (currently their original nav; low value,
  340KB embedded-asset HTML).
- Then merge `nextjs-migration` → `main` (triggers the Pages deploy).
