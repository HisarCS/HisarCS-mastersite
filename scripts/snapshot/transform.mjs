/**
 * Pure half of `npm run db:snapshot`: production's public rows → one SQL
 * transaction for the local database + the storage files it references.
 * No I/O here (tested in tests/unit/snapshot.test.ts); scripts/local-snapshot.mjs
 * does the fetching, copying, and loading.
 */

/** Columns copied per table, in insert order. Explicit, so an unexpected
 *  production column can't break (or leak into) the local load. */
const TABLES = {
  people: [
    'id',
    'public_id',
    'user_id',
    'full_name',
    'graduation_year',
    'bio',
    'avatar_url',
    'avatar_color',
    'resume_url',
    'github_username',
    'is_published',
    'created_at',
    'updated_at',
  ],
  fields: ['id', 'name', 'created_by'],
  person_fields: ['person_id', 'field_id'],
  research: [
    'id',
    'public_id',
    'title',
    'description',
    'avatar_url',
    'created_by',
    'is_published',
    'external_authors',
    'page',
    'venue',
    'presented_on',
    'created_at',
    'updated_at',
  ],
  research_fields: ['research_id', 'field_id'],
  research_members: ['research_id', 'person_id', 'role', 'sort_order'],
  research_links: ['id', 'research_id', 'label', 'url', 'sort_order'],
  research_files: ['id', 'research_id', 'storage_path', 'kind', 'caption', 'sort_order'],
};

/** A JS value as a SQL literal. */
export function sqlLiteral(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') return `${quote(JSON.stringify(v))}::jsonb`;
  return quote(String(v));
}
const quote = (s) => `'${s.replace(/'/g, "''")}'`;

/** Every stored size the site may request for one file (lib/util/media.ts:
 *  avatar-<w>.jpg twins, research …-w<w>.jpg ladder). Original first. */
export function storageVariants(bucket, path) {
  if (bucket === 'avatars' && /avatar-\d+\.jpg$/.test(path))
    return [
      path,
      ...[128, 256, 512, 1024].map((w) => path.replace(/avatar-\d+/, `avatar-${w}`)),
    ].filter((p, i, all) => all.indexOf(p) === i);
  if (/-w2400\.jpg$/i.test(path))
    return [path, ...[800, 1600].map((w) => path.replace(/-w2400\.jpg$/i, `-w${w}.jpg`))];
  return [path];
}

export function buildSnapshot(rows, { prodUrl, localUrl }) {
  const objects = new Map();
  const addObject = (bucket, path) => objects.set(`${bucket}/${path}`, { bucket, path });
  const publicPrefix = `${prodUrl}/storage/v1/object/public/`;
  /** production storage URL → the same object on the local stack */
  const localize = (url) => {
    if (typeof url !== 'string' || !url.startsWith(publicPrefix)) return url;
    const rest = url.slice(publicPrefix.length);
    const [pathWithBucket] = rest.split('?');
    const slash = pathWithBucket.indexOf('/');
    addObject(pathWithBucket.slice(0, slash), pathWithBucket.slice(slash + 1));
    return `${localUrl}/storage/v1/object/public/${rest}`;
  };

  const people = rows.people.map((p) => ({
    ...p,
    user_id: null, // production auth accounts don't exist locally
    avatar_url: localize(p.avatar_url),
    resume_url: localize(p.resume_url),
  }));
  const personIds = new Set(people.map((p) => p.id));
  const fields = rows.fields.map((f) => ({
    ...f,
    created_by: personIds.has(f.created_by) ? f.created_by : null,
  }));
  const fieldIds = new Set(fields.map((f) => f.id));
  const research = rows.research.map((r) => ({
    ...r,
    avatar_url: localize(r.avatar_url),
    created_by: personIds.has(r.created_by) ? r.created_by : null,
  }));
  const researchIds = new Set(research.map((r) => r.id));

  for (const f of rows.research_files) addObject('research-files', f.storage_path);
  for (const r of research) {
    const md = r.page?.markdown ?? '';
    for (const m of md.matchAll(/\]\(([0-9a-f-]{36}\/[^)\s"]+)/g))
      addObject('research-files', m[1]);
  }

  const out = {
    people,
    fields,
    person_fields: rows.person_fields.filter(
      (x) => personIds.has(x.person_id) && fieldIds.has(x.field_id),
    ),
    research,
    research_fields: rows.research_fields.filter(
      (x) => researchIds.has(x.research_id) && fieldIds.has(x.field_id),
    ),
    research_members: rows.research_members.filter(
      (x) => researchIds.has(x.research_id) && personIds.has(x.person_id),
    ),
    research_links: rows.research_links.filter((x) => researchIds.has(x.research_id)),
    research_files: rows.research_files.filter((x) => researchIds.has(x.research_id)),
  };

  const lines = [
    'begin;',
    // wipe the local seed (and any earlier snapshot); cascades to the junctions
    'truncate table public.people, public.research, public.fields cascade;',
    // load as-is: triggers would rewrite github_username / auto-add members
    'set local session_replication_role = replica;',
  ];
  for (const [table, cols] of Object.entries(TABLES)) {
    const list = out[table];
    if (!list.length) continue;
    const values = list.map((r) => `(${cols.map((c) => sqlLiteral(r[c])).join(', ')})`);
    const override = table === 'fields' ? ' overriding system value' : '';
    lines.push(
      `insert into public.${table} (${cols.join(', ')})${override} values\n  ${values.join(',\n  ')};`,
    );
  }
  lines.push(
    "select setval(pg_get_serial_sequence('public.fields', 'id'), coalesce(max(id), 1)) from public.fields;",
  );
  // interest areas: production's when it has the table (null = not migrated
  // there yet → keep the local rows its migration seeded)
  const areas = Array.isArray(rows.interest_areas) ? rows.interest_areas : null;
  if (areas) {
    lines.push('delete from public.interest_areas;');
    if (areas.length)
      lines.push(
        `insert into public.interest_areas (area, tag, sort) values\n  ${areas
          .map((a) => `(${sqlLiteral(a.area)}, ${sqlLiteral(a.tag)}, ${sqlLiteral(a.sort)})`)
          .join(',\n  ')};`,
      );
  }
  lines.push('commit;');
  const counts = count(out);
  if (areas) counts.interest_areas = areas.length;
  return { sql: lines.join('\n') + '\n', objects: [...objects.values()], counts };
}

const count = (out) => Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
