-- ============================================================================
-- ideaLab portfolio — consolidated schema (single source of truth)
--
-- This replaces the earlier 0001–0006 migration chain, which built and then
-- undid several decisions (an admins table dropped for an allowlist, a
-- projects.summary added then replaced by description, a projects.cover_url
-- that nothing read, a fields.slug nothing routed to, grad_year NOT NULL later
-- relaxed, and a guard trigger rewritten to protect fewer columns). None of it
-- had shipped, so it is collapsed here into the intended end state.
--
-- Validated against Postgres 16. Run with `supabase db push` / SQL editor.
-- ============================================================================

create extension if not exists pg_trgm;   -- fuzzy name search, if ever needed server-side
create extension if not exists unaccent;  -- Turkish-aware slugify (ş/ç/ö/ü/ı)

-- ----------------------------------------------------------------------------
-- ADMINS — GitHub-username allowlist. is_admin() matches the login reported by
-- the GitHub OAuth token (raw_user_meta_data), which members cannot edit, so
-- the check is unspoofable and needs no GitHub API or sync step.
-- ----------------------------------------------------------------------------
create table public.admin_github_logins (
  github_login text primary key
    check (github_login ~ '^[a-z0-9][a-z0-9-]{0,38}$'),
  added_at     timestamptz not null default now()
);

-- normalize input so 'KMert10 ' and 'kmert10' can't become two rows
create or replace function public.admin_logins_before_insert()
returns trigger language plpgsql as $$
begin
  new.github_login := lower(btrim(new.github_login));
  return new;
end;
$$;
create trigger admin_logins_normalize before insert on public.admin_github_logins
  for each row execute function public.admin_logins_before_insert();

insert into public.admin_github_logins (github_login) values ('kmert10');

-- SECURITY DEFINER so policies can call it despite the caller's RLS.
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    join public.admin_github_logins a
      on a.github_login = lower(coalesce(
           u.raw_user_meta_data->>'user_name',
           u.raw_user_meta_data->>'preferred_username'))
    where u.id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- PEOPLE
-- ----------------------------------------------------------------------------
create table public.people (
  id              uuid primary key default gen_random_uuid(),
  -- human-readable, name-derived public id used in URLs (person.html?id=…);
  -- auto-generated from full_name (see people_before_insert). Never expose the
  -- raw uuid `id` in links.
  public_id       text not null unique
                    check (public_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- links to auth.users once the member signs in (GitHub OAuth). Profiles can
  -- exist before their owner ever logs in, hence nullable.
  user_id         uuid unique references auth.users (id) on delete set null,
  full_name       text not null check (char_length(full_name) between 1 and 120),
  -- students carry their EXPECTED graduation year; cohort is derived, never
  -- stored. Nullable so a signup-light row can exist before onboarding, but a
  -- profile can never be PUBLISHED without one (constraint below).
  graduation_year smallint check (graduation_year between 2008 and 2999),
  bio             text check (char_length(bio) <= 2000),
  avatar_url      text,  -- Storage URL, GitHub avatar URL, or null → initials tile
  avatar_color    text check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),  -- initials-tile bg
  resume_url      text,
  -- GitHub login, for DISPLAY/links only (authorization uses the OAuth token
  -- directly — see is_admin()). SERVER-OWNED, not member-writable: a trigger
  -- forces it to the unspoofable username from the OAuth token whenever the row
  -- is linked to a login, so nobody can display someone else's handle. It stays
  -- a plain column (not read live from the token) because it must be visible to
  -- anonymous visitors and on profiles that exist before their owner ever logs
  -- in — neither of which can read auth.users.
  github_username text check (github_username ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}$'),
  is_published    boolean not null default false,  -- drafts stay invisible
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint people_published_needs_year
    check (is_published = false or graduation_year is not null)
);

-- Index note: at lab scale (tens–few hundred rows) Postgres seq-scans this
-- table regardless, and the UI fetches the directory once and filters in JS.
-- Only the PK/unique indexes are created. When the dataset actually grows,
-- add back as needed:
--   create index people_grad_year_idx  on public.people (graduation_year, full_name);
--   create index people_name_sort_idx  on public.people (full_name);
--   create index people_name_trgm_idx  on public.people using gin (full_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- FIELDS OF INTEREST — one canonical tag list, shared by people AND projects.
-- Uniqueness is case-insensitive ("Robotics" == "robotics"); there is no
-- separate case-sensitive constraint (it would be redundant) and no slug
-- column (no /fields/[slug] route reads one — tags are matched by name).
-- ----------------------------------------------------------------------------
create table public.fields (
  id         smallint generated always as identity primary key,
  name       text not null check (char_length(name) between 1 and 60),
  created_by uuid references public.people (id) on delete set null  -- null → admin-curated
);
create unique index fields_name_ci_idx on public.fields (lower(name));

-- starter tag list (admin-curated: created_by stays null). Edit freely.
insert into public.fields (name) values
  ('Robotics'), ('Electronics'), ('Woodworking'), ('Textiles'),
  ('Game Design'), ('Ceramics'), ('Biodesign'), ('CS & AI'),
  ('Product Design'), ('3D Printing');

create table public.person_fields (
  person_id uuid     not null references public.people (id) on delete cascade,
  field_id  smallint not null references public.fields (id) on delete cascade,
  primary key (person_id, field_id)
);
create index person_fields_field_idx on public.person_fields (field_id);  -- "everyone in Robotics"

-- ----------------------------------------------------------------------------
-- PROJECTS — one image column (avatar_url), description (no summary stub),
-- and created_by for the creator-as-first-member flow.
-- ----------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  public_id    text not null unique check (public_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),  -- name-derived id, in URLs (project.html?id=…)
  title        text not null check (char_length(title) between 1 and 160),
  description  text check (char_length(description) <= 5000),
  avatar_url   text,
  created_by   uuid references public.people (id) on delete set null,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  person_id  uuid not null references public.people (id) on delete cascade,
  role       text check (char_length(role) <= 80),  -- e.g. "Lead", "Electronics"
  primary key (project_id, person_id)
);
create index project_members_person_idx on public.project_members (person_id);

create table public.project_fields (
  project_id uuid     not null references public.projects (id) on delete cascade,
  field_id   smallint not null references public.fields (id) on delete cascade,
  primary key (project_id, field_id)
);
create index project_fields_field_idx on public.project_fields (field_id);

create table public.project_links (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 80),
  url        text not null check (url ~ '^https?://'),
  sort_order smallint not null default 0
);
create index project_links_project_idx on public.project_links (project_id);

-- metadata for files living in the 'project-files' storage bucket
create table public.project_files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  storage_path text not null unique,  -- '{project_id}/{filename}' in the bucket
  kind         text not null check (kind in ('image', 'pdf', 'other')),
  caption      text check (char_length(caption) <= 200),
  sort_order   smallint not null default 0
);
create index project_files_project_idx on public.project_files (project_id);

-- ----------------------------------------------------------------------------
-- HELPERS
-- ----------------------------------------------------------------------------
create or replace function public.my_person_id()
returns uuid language sql stable security definer
set search_path = public
as $$ select id from public.people where user_id = auth.uid(); $$;

-- the unspoofable GitHub login for a given auth user, straight from the OAuth
-- token. SECURITY DEFINER so the sync trigger can read auth.users for any linked
-- person, not just the caller.
create or replace function public.github_login_of(uid uuid)
returns text language sql stable security definer
set search_path = public
as $$
  select coalesce(u.raw_user_meta_data->>'user_name',
                  u.raw_user_meta_data->>'preferred_username')
  from auth.users u where u.id = uid;
$$;

create or replace function public.is_project_editor(pid uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid and person_id = public.my_person_id()
  );
$$;

-- "Mert Karakaş" → "mert-karakas"
create or replace function public.slugify(input text)
returns text language sql immutable
set search_path = public
as $$
  select trim(both '-' from
    regexp_replace(lower(public.unaccent(input)), '[^a-z0-9]+', '-', 'g'));
$$;

-- academic year flips July 1 (Europe/Istanbul): grad_year >= it → student
create or replace function public.current_academic_year()
returns int language sql stable
as $$
  select extract(year from (now() at time zone 'Europe/Istanbul'))::int
       + case when extract(month from (now() at time zone 'Europe/Istanbul')) >= 7
              then 1 else 0 end;
$$;

-- ----------------------------------------------------------------------------
-- DIRECTORY VIEW — published people + derived cohort + aggregated field names
-- ----------------------------------------------------------------------------
create or replace view public.people_directory
with (security_invoker = true) as
select
  p.id, p.public_id, p.full_name, p.graduation_year,
  case when p.graduation_year >= public.current_academic_year()
       then 'student' else 'alumni' end as cohort,
  p.avatar_url, p.avatar_color, p.github_username,
  coalesce(array_agg(f.name order by f.name) filter (where f.id is not null), '{}') as fields
from public.people p
left join public.person_fields pf on pf.person_id = p.id
left join public.fields f on f.id = pf.field_id
where p.is_published
group by p.id;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger people_touch   before update on public.people
  for each row execute function public.set_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function public.set_updated_at();

-- members may edit their own row, but NOT the login link or publish flag.
-- Admins & the service role (auth.uid() is null) skip the guard.
create or replace function public.guard_people_update()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.user_id      is distinct from old.user_id
    or new.is_published is distinct from old.is_published then
      raise exception 'members cannot change the login link or publish state';
    end if;
  end if;
  return new;
end;
$$;
create trigger people_guard before update on public.people
  for each row execute function public.guard_people_update();

-- generate a unique public_id from full_name when none is supplied (signup)
create or replace function public.people_before_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare base text; candidate text; n int := 1;
begin
  if new.public_id is null or new.public_id = '' then
    base := public.slugify(new.full_name);
    if base = '' then base := 'maker'; end if;
    candidate := base;
    while exists (select 1 from public.people where public_id = candidate) loop
      n := n + 1; candidate := base || '-' || n;
    end loop;
    new.public_id := candidate;
  end if;
  return new;
end;
$$;
create trigger people_public_id before insert on public.people
  for each row execute function public.people_before_insert();

-- same for projects: derive a unique public_id from the title when none given
create or replace function public.projects_before_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare base text; candidate text; n int := 1;
begin
  if new.public_id is null or new.public_id = '' then
    base := public.slugify(new.title);
    if base = '' then base := 'project'; end if;
    candidate := base;
    while exists (select 1 from public.projects where public_id = candidate) loop
      n := n + 1; candidate := base || '-' || n;
    end loop;
    new.public_id := candidate;
  end if;
  return new;
end;
$$;
create trigger projects_public_id before insert on public.projects
  for each row execute function public.projects_before_insert();

-- github_username is a server-owned mirror of the GitHub OAuth identity, never
-- member-writable. Whenever the row is linked to a login, force the column to
-- the username from the OAuth token (same source is_admin() trusts), ignoring
-- whatever the client sent — closes the insert AND update spoof vectors in one
-- place. Unlinked profiles (user_id null) keep the value an admin set for
-- display until their owner logs in, at which point it self-corrects.
create or replace function public.people_sync_github()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    new.github_username :=
      coalesce(public.github_login_of(new.user_id), new.github_username);
  end if;
  return new;
end;
$$;
create trigger people_github_sync before insert or update on public.people
  for each row execute function public.people_sync_github();

-- normalize field name + stamp creator on insert
create or replace function public.fields_before_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  if new.name = '' then
    raise exception 'field name must contain letters or numbers';
  end if;
  if new.created_by is null then
    new.created_by := public.my_person_id();
  end if;
  return new;
end;
$$;
create trigger fields_normalize before insert on public.fields
  for each row execute function public.fields_before_insert();

-- creator auto-joins their new project as the first member
create or replace function public.projects_after_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.project_members (project_id, person_id, role)
    values (new.id, new.created_by, 'Creator')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger projects_auto_member after insert on public.projects
  for each row execute function public.projects_after_insert();

-- orphan cleanup: last member leaving deletes the project
create or replace function public.project_members_after_delete()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.projects p
  where p.id = old.project_id
    and not exists (select 1 from public.project_members pm
                    where pm.project_id = old.project_id);
  return old;
end;
$$;
create trigger project_members_orphan_cleanup after delete on public.project_members
  for each row execute function public.project_members_after_delete();

-- deleting a project also clears its storage folder (no orphaned files)
create or replace function public.projects_after_delete()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  delete from storage.objects
   where bucket_id = 'project-files'
     and (storage.foldername(name))[1] = old.id::text;
  return old;
end;
$$;
create trigger projects_files_cleanup after delete on public.projects
  for each row execute function public.projects_after_delete();

-- ----------------------------------------------------------------------------
-- RPCs
-- ----------------------------------------------------------------------------
-- live profile-URL availability check for the public_id editor (boolean only)
create or replace function public.is_public_id_available(candidate text)
returns boolean language sql stable security definer
set search_path = public
as $$
  select candidate ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     and not exists (
       select 1 from public.people
       where public_id = candidate and user_id is distinct from auth.uid()
     );
$$;
grant execute on function public.is_public_id_available(text) to authenticated;

-- one call erases the member, their tags, memberships (solo projects vanish via
-- orphan cleanup), and the login itself
create or replace function public.delete_my_account()
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  -- full erasure includes uploaded files (avatar + resume folders)
  delete from storage.objects
   where bucket_id in ('avatars', 'resumes')
     and (storage.foldername(name))[1] = auth.uid()::text;
  delete from public.people where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
  -- If your project denies postgres deletes on auth.users, swap the line above
  -- for an Edge Function using the service-role key.
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.admin_github_logins enable row level security;
alter table public.people          enable row level security;
alter table public.fields          enable row level security;
alter table public.person_fields   enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.project_fields  enable row level security;
alter table public.project_links   enable row level security;
alter table public.project_files   enable row level security;

-- admins allowlist: only admins see or manage it (is_admin() bypasses RLS, so
-- this isn't recursive)
create policy "admins manage admins" on public.admin_github_logins
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- people: public reads published; members read + update own row (guard applies)
-- and create their own draft; admins do everything.
create policy "read published people" on public.people
  for select using (is_published);
create policy "read own profile" on public.people
  for select to authenticated using (user_id = auth.uid());
create policy "create own profile" on public.people
  for insert to authenticated
  with check (user_id = auth.uid() and is_published = false);
create policy "update own profile" on public.people
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin all people" on public.people
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- fields: everyone reads; members (with a profile) create; creators delete
-- their own UNUSED field; renaming/merging stays admin-only.
create policy "read fields" on public.fields for select using (true);
create policy "members create fields" on public.fields
  for insert to authenticated
  with check (public.my_person_id() is not null or public.is_admin());
create policy "creator deletes own unused fields" on public.fields
  for delete to authenticated
  using (
    created_by = public.my_person_id()
    and not exists (select 1 from public.person_fields pf
                    where pf.field_id = id and pf.person_id <> public.my_person_id())
    and not exists (select 1 from public.project_fields pj where pj.field_id = id)
  );
create policy "admin all fields" on public.fields
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- person_fields: public reads; members manage their own tags; admins all.
create policy "read person_fields" on public.person_fields for select using (true);
create policy "manage own tags" on public.person_fields
  for all to authenticated
  using (exists (select 1 from public.people p
                 where p.id = person_id and p.user_id = auth.uid()) or public.is_admin())
  with check (exists (select 1 from public.people p
                      where p.id = person_id and p.user_id = auth.uid()) or public.is_admin());

-- projects: public reads published; editors (member list) + creator read drafts
-- and manage; admins all. "creator reads own" covers INSERT..RETURNING, before
-- the auto-membership trigger has made the creator an editor.
create policy "read published projects" on public.projects
  for select using (is_published);
create policy "editors read draft projects" on public.projects
  for select to authenticated
  using (public.is_project_editor(id) or created_by = public.my_person_id() or public.is_admin());
create policy "create project" on public.projects
  for insert to authenticated
  with check ((created_by = public.my_person_id() and created_by is not null) or public.is_admin());
create policy "editors update project" on public.projects
  for update to authenticated
  using (public.is_project_editor(id) or public.is_admin())
  with check (public.is_project_editor(id) or public.is_admin());
create policy "editors delete project" on public.projects
  for delete to authenticated
  using (public.is_project_editor(id) or public.is_admin());

-- project_members / _fields / _links / _files: read if the project is visible
-- to you; editors manage. Members may remove THEMSELVES (leave a project).
create policy "read members of visible projects" on public.project_members
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.is_published)
    or public.is_project_editor(project_id) or public.is_admin());
create policy "editors add members" on public.project_members
  for insert to authenticated
  with check (public.is_project_editor(project_id) or public.is_admin());
create policy "editors update member roles" on public.project_members
  for update to authenticated
  using (public.is_project_editor(project_id) or public.is_admin())
  with check (public.is_project_editor(project_id) or public.is_admin());
create policy "editors remove members or self-leave" on public.project_members
  for delete to authenticated
  using (public.is_project_editor(project_id)
         or person_id = public.my_person_id() or public.is_admin());

create policy "read fields of visible projects" on public.project_fields
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.is_published)
    or public.is_project_editor(project_id) or public.is_admin());
create policy "editors manage project fields" on public.project_fields
  for all to authenticated
  using (public.is_project_editor(project_id) or public.is_admin())
  with check (public.is_project_editor(project_id) or public.is_admin());

create policy "read links of visible projects" on public.project_links
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.is_published)
    or public.is_project_editor(project_id) or public.is_admin());
create policy "editors manage links" on public.project_links
  for all to authenticated
  using (public.is_project_editor(project_id) or public.is_admin())
  with check (public.is_project_editor(project_id) or public.is_admin());

create policy "read files of visible projects" on public.project_files
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.is_published)
    or public.is_project_editor(project_id) or public.is_admin());
create policy "editors manage files" on public.project_files
  for all to authenticated
  using (public.is_project_editor(project_id) or public.is_admin())
  with check (public.is_project_editor(project_id) or public.is_admin());

-- ----------------------------------------------------------------------------
-- GRANTS — the DOOR; RLS above is the LOCK. Broad grants expose nothing on
-- their own. Hosted Supabase applies these via default privileges; local
-- stacks don't always, so set them explicitly for portability.
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

-- ----------------------------------------------------------------------------
-- STORAGE — three public-read buckets; writes scoped by folder ownership.
--   avatars/{auth.uid()}/...        member's own folder (512px + 128px thumb)
--   resumes/{auth.uid()}/...        member's own folder (PDF)
--   project-files/{project_id}/...  writable by that project's member list
-- Upload requirements (types, size caps, client-side image optimization) live
-- in ONE place the whole frontend shares: IDEALAB_UPLOADS in config.js.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('resumes', 'resumes', true),
  ('project-files', 'project-files', true)
on conflict (id) do nothing;

create policy "avatar owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'resumes')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar owner updates" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'resumes')
         and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'resumes')
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "project editors write files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-files'
              and public.is_project_editor(((storage.foldername(name))[1])::uuid));
create policy "project editors update files" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-files'
         and public.is_project_editor(((storage.foldername(name))[1])::uuid));
create policy "project editors delete files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-files'
         and public.is_project_editor(((storage.foldername(name))[1])::uuid));
