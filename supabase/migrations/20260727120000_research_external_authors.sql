-- ============================================================================
-- Research: external collaborators + equal members
--
-- 1. `research.external_authors` — collaborators who have no account here
--    (outside co-authors, visiting researchers). Stored as a jsonb array of
--    {name, role} directly on the research row, NOT in `research_members`.
--
--    Why a column and not a junction row (cf. ADR-0004, which chose relations
--    for tags): `research_members` is the permission system — is_project_editor()
--    reads it, and the dashboard/profile pages query it in reverse by person_id
--    on an indexed FK. External authors have no permissions, no reverse lookup,
--    and no `people` row to reference; they are display-only credits. For that
--    shape a column is the honest model, and it leaves the permission table —
--    and its primary key — untouched.
--
-- 2. Members are equal. The creator was auto-added with the role label
--    "Creator", which implied a hierarchy that never existed: every row in
--    research_members already grants identical rights, and any member may edit
--    any other member's role. Drop the label so the UI can't imply otherwise.
--    (`research.created_by` stays — the insert policy needs it for provenance.)
-- ============================================================================

alter table public.research
  add column if not exists external_authors jsonb not null default '[]'::jsonb;

alter table public.research
  drop constraint if exists research_external_authors_is_array;
alter table public.research
  add constraint research_external_authors_is_array
  check (jsonb_typeof(external_authors) = 'array');

-- creator joins as an ordinary member (function name kept — see the rename
-- migration's note on not renaming helpers)
create or replace function public.projects_after_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.research_members (research_id, person_id, role)
    values (new.id, new.created_by, 'Member')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- retire the label on existing rows
update public.research_members set role = 'Member' where role = 'Creator';
