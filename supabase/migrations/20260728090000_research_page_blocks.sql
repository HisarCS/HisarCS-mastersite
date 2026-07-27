-- ============================================================================
-- Research: block-based pages.
--
-- `research.page` holds the composed page as an ordered list of content
-- blocks: { "version": 1, "blocks": [ { "type", "variant"?, "data" } ] }.
-- Null means "no composed page" — the public view falls back to rendering
-- `description`, so every existing entry keeps working unchanged.
--
-- jsonb (not tables) because blocks are a presentation document, not
-- relational data: never queried across entries, always read/written whole,
-- and new block types must not require migrations. Same reasoning as
-- `external_authors`.
-- ============================================================================

alter table public.research
  add column if not exists page jsonb;

alter table public.research
  drop constraint if exists research_page_is_object;
alter table public.research
  add constraint research_page_is_object
  check (page is null or jsonb_typeof(page) = 'object');
