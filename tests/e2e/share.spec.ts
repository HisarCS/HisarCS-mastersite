import { expect, test } from '@playwright/test';
import { mockSupabase, researchEntryRow } from './support/supabase';

/** Share pages (/r/<slug>/), the Share button, and the sitemap (ADR-0021). */

test('a share page serves link-preview tags as plain HTML', async ({ request }) => {
  // what Slack/WhatsApp see: the raw HTML, no JavaScript
  const html = await (await request.get('/r/otto/')).text();
  expect(html).toContain('<meta property="og:title" content="Otto — ideaLab"/>');
  expect(html).toMatch(/<meta property="og:description" content="A multi-modal parametric CAD/);
  expect(html).toMatch(/<meta property="og:image" content="[^"]*\/research\/thumb\/otto\.jpg"/);
  expect(html).toMatch(/<meta property="og:url" content="[^"]*\/r\/otto\/"/);
});

test('a person opening a share page lands on the research page', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/r/otto/');
  await expect(page).toHaveURL(/\/research\/\?id=otto$/);
  await expect(page.locator('main h1').first()).toContainText('Otto');
});

test('Share copies the share-page link for a write-up', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockSupabase(page);
  await page.goto('/research/?id=parametrix');
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByRole('button', { name: 'Link copied ✓' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/r\/parametrix\/$/);
});

test('an entry without a built share page shares its own link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockSupabase(page, { researchEntry: researchEntryRow() });
  await page.goto('/research/?id=sensor-garden');
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByRole('button', { name: 'Link copied ✓' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    /\/research\?id=sensor-garden$/,
  );
});

test('the sitemap lists the pages and every share page', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  for (const path of ['/research/', '/members/', '/about/', '/r/otto/', '/r/dancar/'])
    expect(xml).toContain(`${path}</loc>`);
});
