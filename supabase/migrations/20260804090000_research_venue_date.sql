-- ============================================================================
-- Research: venue + date, shown on the index card and the entry page
-- ("IDC '26 · Jun 2026"). Both nullable — older entries and prototypes
-- without a venue keep working; the card falls back to "ideaLab research".
-- ============================================================================

alter table public.research
  add column if not exists venue text,
  add column if not exists presented_on date;
