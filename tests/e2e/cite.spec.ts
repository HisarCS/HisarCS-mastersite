import { expect, test } from '@playwright/test';
import { mockSupabase, researchEntryRow } from './support/supabase';

/** "Cite this" on curated write-ups and member entries (lib/domain/citation.ts). */

test('a curated write-up copies its BibTeX', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockSupabase(page);
  await page.goto('/research/?id=parametrix');

  await page.getByRole('button', { name: 'Cite' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cite this' });
  await expect(dialog.getByTestId('citation-text')).toContainText(
    'Dayangaç, E., Bener, M., & Yalçın, S. (2025).',
  );
  await dialog.getByRole('button', { name: 'BibTeX' }).click();
  await expect(dialog.getByTestId('citation-text')).toContainText(
    '@inproceedings{dayangac2025parametrix,',
  );
  await dialog.getByRole('button', { name: 'Copy' }).click();
  await expect(dialog.getByRole('button', { name: 'Copied ✓' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'doi = {10.21240/constr/2025/43.X}',
  );
});

test('a member entry is cited with its members and venue', async ({ page }) => {
  await mockSupabase(page, {
    researchEntry: researchEntryRow({ venue: "IDC '26", presented_on: '2026-06-15' }),
  });
  await page.goto('/research/?id=sensor-garden');
  await page.getByRole('button', { name: 'Cite' }).click();
  await expect(page.getByTestId('citation-text')).toHaveText(
    /^Maker, O\. \(2026\)\. Sensor Garden\. In IDC '26\. http.*\/research\?id=sensor-garden$/,
  );
});
