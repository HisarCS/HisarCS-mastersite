-- Anonymous visitors could read people.user_id — the auth account uuid behind
-- each profile — through PostgREST (`/rest/v1/people?select=*`). No public
-- page needs it: anon queries select named columns (lib/data/members.ts), and
-- the only lookup by user_id is the signed-in member's own profile, which runs
-- as `authenticated` (unchanged here).
--
-- Column-level privileges only take effect once the table-wide grant is gone,
-- so: revoke SELECT on the table from anon, then grant it back on every column
-- except user_id. RLS still decides WHICH rows anon sees (published only).
revoke select on public.people from anon;
grant select (
  id, public_id, full_name, graduation_year, bio, avatar_url, avatar_color,
  resume_url, github_username, is_published, created_at, updated_at
) on public.people to anon;
