-- Interest areas — the umbrellas /research groups and filters by (ADR-0022).
-- Moved from code (lib/domain/interests.ts, which stays as the offline
-- fallback) into the database so admins can re-file tags from /admin without
-- a deploy. One row per (area, tag); `sort` orders the areas for display.
-- Tags are stored lower-case: lookups are case-insensitive.
create table public.interest_areas (
  area text not null check (length(trim(area)) between 1 and 60),
  tag  text not null check (tag = lower(tag) and length(trim(tag)) between 1 and 60),
  sort smallint not null default 0,
  primary key (area, tag)
);

alter table public.interest_areas enable row level security;

create policy "read interest areas" on public.interest_areas
  for select
  using (true);

create policy "admins manage interest areas" on public.interest_areas
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- start from exactly the code's table, so nothing changes on deploy
insert into public.interest_areas (area, tag, sort) values
  ('Parametric Design', 'parametric cad', 0),
  ('Parametric Design', 'parametric design', 0),
  ('Digital Fabrication', 'laser cutting', 1),
  ('Digital Fabrication', 'fabrication', 1),
  ('Digital Fabrication', 'kits', 1),
  ('Digital Fabrication', '3d printing', 1),
  ('Robotics', 'robotics', 2),
  ('Robotics', 'biomimetic robots', 2),
  ('Robotics', 'mechanics', 2),
  ('AI', 'ai', 3),
  ('AI', 'llm', 3),
  ('AI', 'pose classification', 3),
  ('AI', 'ai literacy', 3),
  ('Learning', 'education', 4),
  ('Learning', 'k-12', 4),
  ('Learning', 'algorithmic thinking', 4),
  ('Learning', 'ai literacy', 4),
  ('HCI & AR', 'ar', 5),
  ('HCI & AR', 'tangible', 5),
  ('HCI & AR', 'dance', 5);
