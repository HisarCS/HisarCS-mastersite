#!/usr/bin/env node
/**
 * npm run db:snapshot — fill the LOCAL Supabase stack with production's public
 * data (published members, their tags, published research + members, links,
 * files, and the storage objects they reference), replacing the fake seed.
 *
 * Production is only READ, with the public anon key from lib/env.ts — exactly
 * what the live site shows anyone. Writes go only to the local stack (the
 * script refuses any non-localhost target). Production auth links are dropped
 * (user_id = null): sign in locally and onboarding creates your own row.
 *
 * The generated SQL is kept at supabase/.snapshot/public-snapshot.sql
 * (gitignored — it holds real people's profiles).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildSnapshot, storageVariants } from './snapshot/transform.mjs';

const root = new URL('..', import.meta.url).pathname;

// --- production (read-only): the same public URL + anon key the site ships ---
const envTs = readFileSync(`${root}lib/env.ts`, 'utf8');
const prodBlock = envTs.slice(envTs.indexOf('production:'));
const prodUrl = prodBlock.match(/url:\s*'([^']+)'/)?.[1];
const prodKey = prodBlock.match(/anonKey:\s*'([^']+)'/)?.[1];
if (!prodUrl || !prodKey) throw new Error('could not read the production block of lib/env.ts');

// --- local target: from the running stack, and it must be localhost ---
const status = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
);
const localUrl = status.API_URL;
const serviceKey = status.SERVICE_ROLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(localUrl ?? ''))
  throw new Error(`refusing to write to a non-local target: ${localUrl}`);
const dbContainer = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' })
  .split('\n')
  .find((n) => n.startsWith('supabase_db_'));
if (!dbContainer) throw new Error('local Supabase DB container not running — npm run stack first');

const read = async (path, { optional = false } = {}) => {
  const res = await fetch(`${prodUrl}/rest/v1/${path}`, {
    headers: { apikey: prodKey, Authorization: `Bearer ${prodKey}` },
  });
  // a table production doesn't have yet (migration not pushed) → null
  if (optional && res.status === 404) return null;
  if (!res.ok) throw new Error(`production read ${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

console.log(`Reading public data from ${prodUrl} …`);
const rows = {
  // named columns: anon may not read user_id (migration 20260928120000)
  people: await read(
    'people?select=id,public_id,full_name,graduation_year,bio,avatar_url,avatar_color,resume_url,github_username,is_published,created_at,updated_at&is_published=eq.true',
  ),
  fields: await read('fields?select=id,name,created_by'),
  person_fields: await read('person_fields?select=*'),
  research: await read('research?select=*&is_published=eq.true'),
  research_fields: await read('research_fields?select=*'),
  research_members: await read('research_members?select=*'),
  research_links: await read('research_links?select=*'),
  research_files: await read('research_files?select=*'),
  interest_areas: await read('interest_areas?select=area,tag,sort', { optional: true }),
};

const snap = buildSnapshot(rows, { prodUrl, localUrl });

// --- storage: copy each referenced object (and its size variants) ---
let copied = 0;
let missing = 0;
for (const { bucket, path } of snap.objects) {
  for (const p of storageVariants(bucket, path)) {
    const src = await fetch(`${prodUrl}/storage/v1/object/public/${bucket}/${p}`);
    if (!src.ok) {
      missing++;
      continue;
    }
    const body = Buffer.from(await src.arrayBuffer());
    const put = await fetch(`${localUrl}/storage/v1/object/${bucket}/${p}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'content-type': src.headers.get('content-type') ?? 'application/octet-stream',
        'cache-control': '3600',
        'x-upsert': 'true',
      },
      body,
    });
    if (!put.ok) throw new Error(`local upload ${bucket}/${p}: ${put.status} ${await put.text()}`);
    copied++;
  }
}

// --- database: one transaction replacing the local rows ---
mkdirSync(`${root}supabase/.snapshot`, { recursive: true });
writeFileSync(`${root}supabase/.snapshot/public-snapshot.sql`, snap.sql);
execFileSync(
  'docker',
  ['exec', '-i', dbContainer, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'],
  { input: snap.sql, stdio: ['pipe', 'inherit', 'inherit'] },
);

console.log('Loaded into the local database:', snap.counts);
console.log(
  `Storage: ${copied} files copied` +
    (missing ? `, ${missing} size variants not present in production (skipped)` : ''),
);
