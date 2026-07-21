// ============================================================================
// ideaLab — backend ↔ frontend e2e tests
// Run with the local stack up:   npm run stack   then   npm test
// Live tests skip (with a note) when Supabase isn't reachable, so the suite
// is always safe to run.
// ============================================================================
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// read the local Supabase URL + anon key straight out of config.js (resolved
// relative to this file, so it works from any cwd), keeping the tests in
// lockstep with what the site actually uses
const cfg = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const localBlock = cfg.split('local:')[1];
const SUPABASE_URL = localBlock.match(/SUPABASE_URL:\s*'([^']*)'/)[1];
const ANON_KEY = localBlock.match(/SUPABASE_ANON_KEY:\s*'([^']*)'/)[1];
const REST = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const HEADERS = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

let stackUp = false;
test.beforeAll(async () => {
  try {
    const r = await fetch(REST('fields?select=id&limit=1'), { headers: HEADERS });
    stackUp = r.ok;
  } catch {
    /* stack down */
  }
  if (!stackUp)
    console.log('⚠ Supabase stack not reachable — live tests will be skipped (npm run stack)');
});

// ---------------------------------------------------------------- live tests

test('homepage renders people from the database', async ({ page }) => {
  test.skip(!stackUp, 'local Supabase not running');
  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.goto('/');
  await page.waitForSelector('.pixel.person');
  expect(logs.join('\n')).toContain('from Supabase');
});

test('every pixel links to a unique person URL', async ({ page }) => {
  test.skip(!stackUp, 'local Supabase not running');
  await page.goto('/');
  await page.waitForSelector('.pixel.person');
  const hrefs = await page.$$eval('.pixel.person', (els) => els.map((e) => e.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  expect(new Set(hrefs).size).toBe(hrefs.length); // all distinct
  for (const h of hrefs) expect(h).toMatch(/^person\?id=/); // real public_ids, extensionless
});

test('person page loads the requested person by id', async ({ page }) => {
  test.skip(!stackUp, 'local Supabase not running');
  await page.goto('/person?id=ceren-kaya'); // seeded, published
  await expect(page.locator('h1')).toContainText('Ceren Kaya');
  await expect(page.locator('#meta')).toContainText('Class of');
});

test('cohort derives from graduation year', async ({ page }) => {
  test.skip(!stackUp, 'local Supabase not running');
  await page.goto('/person?id=elif-demir'); // seeded grad 2022
  await expect(page.locator('.badge')).toContainText(/alumni/i);
});

test('RLS: draft people are invisible to the public', async () => {
  test.skip(!stackUp, 'local Supabase not running');
  const r = await fetch(REST('people?select=public_id&public_id=eq.draft-deniz'), {
    headers: HEADERS,
  });
  expect(r.ok).toBeTruthy();
  expect(await r.json()).toEqual([]); // seeded draft, hidden
});

test('RLS: anonymous visitors cannot write', async () => {
  test.skip(!stackUp, 'local Supabase not running');
  const r = await fetch(REST('people'), {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: 'Intruder', graduation_year: 2030 }),
  });
  expect([401, 403]).toContain(r.status);
});

test('RLS: draft projects and their links are hidden', async () => {
  test.skip(!stackUp, 'local Supabase not running');
  const r = await fetch(REST('projects?select=public_id'), { headers: HEADERS });
  const ids = (await r.json()).map((p) => p.public_id);
  expect(ids).toContain('pixel-wall'); // published
  expect(ids).not.toContain('seed-garden'); // seeded draft
});

// ------------------------------------------------------------- always-on test

test('graceful fallback: site still renders with no backend at all', async ({ page }) => {
  // simulate a dead/misconfigured backend regardless of the real stack
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IDEALAB_CONFIG', {
      value: { SUPABASE_URL: 'http://127.0.0.1:59999', SUPABASE_ANON_KEY: 'x' },
      writable: false,
    });
  });
  await page.goto('/');
  await page.waitForSelector('.pixel.person', { timeout: 15_000 });
  const count = await page.locator('.pixel.person').count();
  expect(count).toBeGreaterThanOrEqual(20); // mock people rendered
});
