# Tidy backlog

Ledger for the recurring tidy pass (see `.claude/agents/tidy.md`). Done items
are removed; new finds are appended. Last audit: 2026-11-02 (pass 1 shipped
palette/initials/memberColor consolidation, `write()`/`readRows()` data-layer
helpers, dead-code removal).

## Large (own PR each)

- **Split ResearchEditor.tsx (~920 LOC)** into panel components (Details,
  Page, Links, Avatar, Files, Members, Delete) + a `run(setHint, op)` helper
  for its ~12 identical busy/hint/load handler bodies.
- **Member-area form kit**: `<FieldPicker>` + `useFieldSelection` (tag picker
  is copied in ResearchEditor, Dashboard, Onboarding), `<PublishNotice>`,
  `<StatusBadge>`, `<Hint>`; one shared `forms.module.css` (Dashboard shares
  ~194/240 CSS lines with ResearchEditor).
- **CSS consolidation**: spinner/loading block (4 copies → `<PageLoading>`),
  page header eyebrow/title/sub (4 copies → `<PageHeader>`), `<SiteFooter>`
  (3 copies), segmented-control/tabs (4 copies), button pair (2 copies).
- **`<AvatarTile>`**: the avatar/initials tile markup repeats ~11×; also
  removes most `no-img-element` lint disables.
- **`<TagLink>`**: tag chips render in 5 places with uneven styling —
  ResearchView's curated tags lack the `--chip-c` category color.

## Medium

- `useAsync` hook for the 8 `let alive = true` effects; `withMocks()` for the
  5 mock-fallback call sites.
- `lib/routes.ts` for the ~20 inline `/person?id=` / `/research?id=` /
  `/research/edit?id=` strings (app/r/[slug]/page.tsx builds its own URL
  instead of `researchPageUrl`).
- Admin panel: `useAdminResource` hook (PublishQueue, AdminList,
  InterestAreasEditor hand-roll the same load/error/act state);
  InterestAreasEditor re-implements `tableFromRows`; admin.ts reads skip
  `readRows`.
- Fence modules: move `ParseResult` + `parsePlacement` out of chartSpec.ts;
  dedupe the `value | label` split (chartSpec vs fenceSpecs).
- `<ResearchImg>`: placement style + img attrs duplicated in MarkdownPage (2×)
  and CompareSlider.
- Upload rules: derive `accept=` strings and help text from `UPLOAD_SPECS`
  (hard-coded in ResearchEditor ×2 and Dashboard ×2).
- `syncJoinRows()`: profile.syncPersonFields and
  researchEntries.syncResearchFields are twins.
- interest_areas query + row type exist 2–3× (admin.ts, interests.ts,
  domain/interests.ts).

## Small

- `deriveMemberScreen` (memberState.ts) is the tested spec but MemberArea
  re-implements it — wire it in (behavioral review needed).
- `citation.ts` `initials` → rename `apaInitials` (different semantics from
  palette initials).
- ChartSvg PALETTE has a deliberately different order → move to palette.ts as
  `CHART_SERIES`; graphThemes.ts hard-codes `#e8542f`.
- `listResearch()` (research.ts) is a trivial wrapper; `RESEARCH_FACETS`
  export is tests-only; `RESEARCH_VIEWS` registry is empty and `view` /
  `endDate` / `contentSrc` / `resources` are never set on curated items.
- Rename CardGrid.module.css → MembersIndex.module.css (only consumer).
- NetworkGraph: client-to-viewBox conversion duplicated at :95-98 and
  :108-112.
- PersonView research-ref initials now uppercase (canonical `initials()`); was
  lowercase before pass 1 — fine, noted for consistency.
