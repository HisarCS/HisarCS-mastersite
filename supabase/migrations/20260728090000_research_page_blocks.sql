-- ============================================================================
-- Research: composed page bodies (`research.page`).
--
-- The column is format-agnostic: it stores a versioned document
-- { "version": <n>, ... }, and null means "no composed page" — the public
-- view falls back to rendering `description`, so entries without a page keep
-- working unchanged.
--
-- Current format (v2): { "version": 2, "markdown": "..." } — see ADR-0019.
-- This migration originally shipped
-- for a v1 block format that was replaced within days (hence the filename);
-- this comment was corrected afterwards. Comment-only corrections to applied
-- migrations are allowed — comments never execute — the SQL below is
-- untouched.
--
-- jsonb (not a table) because the page is a presentation document, not
-- relational data: never queried across entries, always read/written whole,
-- and format evolution must not require migrations. Same reasoning as
-- `external_authors`.
-- ============================================================================

alter table public.research
  add column if not exists page jsonb;

alter table public.research
  drop constraint if exists research_page_is_object;
alter table public.research
  add constraint research_page_is_object
  check (page is null or jsonb_typeof(page) = 'object');
