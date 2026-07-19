-- ============================================================================
-- ideaLab — local development seed data
-- Replayed automatically on `supabase db reset` (and on a fresh
-- `supabase start`). Runs as the service role, so RLS/guards don't apply —
-- which is why it may insert people as already-published.
-- NEVER run against production; real data comes from real signups.
-- ============================================================================

-- ---------------------------------------------------------------- people ----
insert into public.people (public_id, full_name, graduation_year, is_published, github_username, avatar_url) values
  ('elif-demir',    'Elif Demir',    2022, true, null, 'https://i.pravatar.cc/240?img=2'),
  ('kaan-yildiz',   'Kaan Yıldız',   2028, true, null, 'https://i.pravatar.cc/240?img=3'),
  ('zeynep-aksoy',  'Zeynep Aksoy',  2021, true, null, 'https://i.pravatar.cc/240?img=4'),
  ('deniz-celik',   'Deniz Çelik',   2029, true, null, 'https://i.pravatar.cc/240?img=5'),
  ('selin-arslan',  'Selin Arslan',  2027, true, null, 'https://i.pravatar.cc/240?img=6'),
  ('emre-koc',      'Emre Koç',      2024, true, null, 'https://i.pravatar.cc/240?img=7'),
  ('aylin-sahin',   'Aylin Şahin',   2028, true, null, 'https://i.pravatar.cc/240?img=8'),
  ('baran-ozturk',  'Baran Öztürk',  2023, true, null, 'https://i.pravatar.cc/240?img=9'),
  ('ceren-kaya',    'Ceren Kaya',    2027, true, null, 'https://i.pravatar.cc/240?img=10'),
  ('mehmet-aydin',  'Mehmet Aydın',  2020, true, null, 'https://i.pravatar.cc/240?img=11'),
  ('ipek-dogan',    'İpek Doğan',    2029, true, null, 'https://i.pravatar.cc/240?img=12'),
  ('arda-gunes',    'Arda Güneş',    2028, true, null, 'https://i.pravatar.cc/240?img=13'),
  ('naz-erdem',     'Naz Erdem',     2025, true, null, 'https://i.pravatar.cc/240?img=14'),
  ('cem-yilmaz',    'Cem Yılmaz',    2027, true, null, 'https://i.pravatar.cc/240?img=15'),
  ('lara-polat',    'Lara Polat',    2026, true, null, 'https://i.pravatar.cc/240?img=16'),
  ('umut-kara',     'Umut Kara',     2029, true, null, 'https://i.pravatar.cc/240?img=17'),
  ('defne-ates',    'Defne Ateş',    2028, true, null, 'https://i.pravatar.cc/240?img=18'),
  ('ege-turan',     'Ege Turan',     2022, true, null, 'https://i.pravatar.cc/240?img=19'),
  ('melis-unal',    'Melis Ünal',    2027, true, null, 'https://i.pravatar.cc/240?img=20'),
  ('yigit-sonmez',  'Yiğit Sönmez',  2024, true, null, 'https://i.pravatar.cc/240?img=21'),
  ('ada-korkmaz',   'Ada Korkmaz',   2029, true, null, 'https://i.pravatar.cc/240?img=22'),
  ('ozan-tekin',    'Ozan Tekin',    2023, true, null, 'https://i.pravatar.cc/240?img=23'),
  ('sude-bilgin',   'Sude Bilgin',   2028, true, null, 'https://i.pravatar.cc/240?img=24'),
  ('alp-erten',     'Alp Erten',     2027, true, null, 'https://i.pravatar.cc/240?img=25'),
  ('mina-sezer',    'Mina Sezer',    2026, true, null, 'https://i.pravatar.cc/240?img=26');

-- one unpublished draft, to exercise the admin publish flow locally
insert into public.people (public_id, full_name, graduation_year, is_published) values
  ('draft-deniz', 'Draft Deniz', 2030, false);

-- --------------------------------------------------------- interest tags ----
-- spread the ten seed fields across everyone: person N gets 2 tags
insert into public.person_fields (person_id, field_id)
select p.id, f.id
from (select id, row_number() over (order by public_id) as rn from public.people where is_published) p
join public.fields f
  on f.id = ((p.rn - 1) % 10) + 1 or f.id = (p.rn % 10) + 1;

-- -------------------------------------------------------- sample projects ----
insert into public.projects (public_id, title, description, is_published, created_by) values
  ('pixel-wall', 'Pixel Wall',
   'A 4×6 meter interactive LED wall in the lab''s entrance. Each tile is a shift-registered RGB module driven by an ESP32 mesh; the wall mirrors the homepage — every lab member gets a pixel.',
   true, (select id from public.people where public_id = 'ipek-dogan')),
  ('seed-garden', 'Seed Garden',
   'Self-watering planter grid with moisture telemetry, grown from the biodesign bench.',
   false, (select id from public.people where public_id = 'ipek-dogan'));
-- (the after-insert trigger already added each creator to project_members)

insert into public.project_members (project_id, person_id, role)
select pr.id, pe.id, v.role
from (values ('pixel-wall', 'elif-demir', 'Electronics'),
             ('pixel-wall', 'arda-gunes', 'Firmware')) as v(pslug, mslug, role)
join public.projects pr on pr.public_id = v.pslug
join public.people pe on pe.public_id = v.mslug;

insert into public.project_fields (project_id, field_id)
select pr.id, f.id
from public.projects pr
join public.fields f on (pr.public_id, f.name) in
  (('pixel-wall', 'Electronics'), ('pixel-wall', 'CS & AI'), ('seed-garden', 'Biodesign'));

insert into public.project_links (project_id, label, url)
select pr.id, v.label, v.url
from (values ('pixel-wall', 'GitHub repo', 'https://github.com/HisarCS/pixel-wall'),
             ('pixel-wall', 'Build log',   'https://example.com/blog/pixel-wall')) as v(pslug, label, url)
join public.projects pr on pr.public_id = v.pslug;
