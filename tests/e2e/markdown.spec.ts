import { expect, test, type Page } from '@playwright/test';
import { mockSupabase, researchEntryRow } from './support/supabase';

/**
 * Research-page markdown fences (components/markdown/fences.tsx) rendered on
 * the public entry page, through the real renderer.
 */

const fence = (lang: string, body: string) => '```' + lang + '\n' + body + '\n```';

async function openPage(page: Page, markdown: string) {
  await mockSupabase(page, {
    researchEntry: researchEntryRow({ page: { version: 2, markdown } }),
  });
  await page.goto('/research/?id=sensor-garden');
}

test('chart and stats fences are drawn, not shown as code', async ({ page }) => {
  await openPage(
    page,
    [
      fence('stats', '€4.10 | per panel\n14 | days grow time'),
      fence('chart', 'question: Does it match foam?\nx: 250 Hz, 1 kHz\nPanel: 0.31, 0.55'),
    ].join('\n\n'),
  );

  await expect(page.getByText('€4.10')).toBeVisible();
  await expect(page.getByText('days grow time')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Does it match foam?' })).toBeVisible();
  await expect(page.locator('pre')).toHaveCount(0);
});

test('a malformed fence shows its error inline, naming the fence', async ({ page }) => {
  await openPage(page, fence('chart', 'x: a\nS: 1'));
  await expect(page.getByText(/```chart: add a "question:" line/)).toBeVisible();
});

test('an unregistered fence language renders as ordinary code', async ({ page }) => {
  await openPage(page, fence('python', 'print("hi")'));
  await expect(page.locator('pre')).toContainText('print("hi")');
});
