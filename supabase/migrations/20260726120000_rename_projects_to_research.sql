-- ============================================================================
-- Rename the member-created "projects" feature to "research".
--
-- Tables, columns, FKs, primary keys, indexes, triggers, and RLS policies all
-- bind by internal object id, so ALTER ... RENAME carries them automatically —
-- only SQL/plpgsql *function bodies* (parsed by name at runtime) and the storage
-- bucket-id *string* are name-bound, so those are recreated below. Helper /
-- policy / trigger NAMES are intentionally kept (is_project_editor, "project
-- editors ..." etc.): renaming them would force every dependent policy to be
-- rebuilt for no functional gain. They're internal and never surface in the app.
--
-- Data-preserving (RENAME + row moves only). Safe on a fresh local DB (the base
-- schema creates the `projects` objects first, then this renames them) and on
-- prod via `supabase db push`.
-- ============================================================================

-- 1. Tables ------------------------------------------------------------------
alter table public.projects        rename to research;
alter table public.project_members rename to research_members;
alter table public.project_fields  rename to research_fields;
alter table public.project_links   rename to research_links;
alter table public.project_files   rename to research_files;

-- 2. The parent-FK column on each child table --------------------------------
alter table public.research_members rename column project_id to research_id;
alter table public.research_fields  rename column project_id to research_id;
alter table public.research_links   rename column project_id to research_id;
alter table public.research_files   rename column project_id to research_id;

-- 3. Recreate functions whose bodies name the old tables/columns -------------
create or replace function public.is_project_editor(pid uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.research_members
    where research_id = pid and person_id = public.my_person_id()
  );
$$;

create or replace function public.projects_before_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare base text; candidate text; n int := 1;
begin
  if new.public_id is null or new.public_id = '' then
    base := public.slugify(new.title);
    if base = '' then base := 'research'; end if;
    candidate := base;
    while exists (select 1 from public.research where public_id = candidate) loop
      n := n + 1; candidate := base || '-' || n;
    end loop;
    new.public_id := candidate;
  end if;
  return new;
end;
$$;

create or replace function public.projects_after_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.research_members (research_id, person_id, role)
    values (new.id, new.created_by, 'Creator')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.project_members_after_delete()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.research r
  where r.id = old.research_id
    and not exists (select 1 from public.research_members rm
                    where rm.research_id = old.research_id);
  return old;
end;
$$;

-- 4. Storage bucket 'project-files' -> 'research-files' ----------------------
-- Add the new bucket. We deliberately do NOT mutate or delete the old one:
-- storage.protect_delete forbids deleting storage rows in SQL, and changing a
-- live bucket's id destabilizes the Storage service. The old 'project-files'
-- bucket is left empty and, after this migration, has no policies — so it's
-- inert (remove it via the Storage API / Studio if you want it gone). Then
-- recreate the three editor policies for the new bucket (they name the bucket
-- string; is_project_editor keeps its name so nothing else changes).
insert into storage.buckets (id, name, public)
  values ('research-files', 'research-files', true)
  on conflict (id) do nothing;

drop policy if exists "project editors write files"  on storage.objects;
drop policy if exists "project editors update files" on storage.objects;
drop policy if exists "project editors delete files" on storage.objects;

create policy "project editors write files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'research-files'
              and public.is_project_editor(((storage.foldername(name))[1])::uuid));
create policy "project editors update files" on storage.objects
  for update to authenticated
  using (bucket_id = 'research-files'
         and public.is_project_editor(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'research-files'
              and public.is_project_editor(((storage.foldername(name))[1])::uuid));
create policy "project editors delete files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'research-files'
         and public.is_project_editor(((storage.foldername(name))[1])::uuid));
