-- ============================================================================
-- Research members: explicit ordering (author order matters — first author
-- first). New members are appended; the editor writes sort_order on reorder.
-- External collaborators need no column: their jsonb array order is the order.
-- ============================================================================

alter table public.research_members
  add column if not exists sort_order smallint not null default 0;

-- deterministic starting order for existing rows
update public.research_members rm
set sort_order = t.rn
from (
  select research_id, person_id,
         row_number() over (partition by research_id order by person_id) - 1 as rn
  from public.research_members
) t
where rm.research_id = t.research_id and rm.person_id = t.person_id;
