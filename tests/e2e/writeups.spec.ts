import { expect, test } from '@playwright/test';
import { mockSupabase } from './support/supabase';
import { RESEARCH_ITEMS } from '../../lib/data/research';

/** Curated write-ups are markdown (public/research/<slug>.md) rendered by the
 *  site's own renderer — no preserved HTML, no Shadow DOM. */

for (const { slug } of RESEARCH_ITEMS) {
  test(`${slug}: renders through the markdown renderer with its images`, async ({ page }) => {
    await mockSupabase(page);
    await page.goto(`/research/?id=${slug}`);
    const article = page.locator('main article');
    await expect(article.locator('h2').first()).toBeVisible();
    // fences drew (no raw ``` blocks), and nothing hides in a shadow root
    await expect(article.locator('pre:has-text("```")')).toHaveCount(0);
    // (Next's route announcer has its own shadow root — only the page matters)
    expect(
      await page.evaluate(() => [...document.querySelectorAll('main *')].some((e) => e.shadowRoot)),
    ).toBe(false);
    // every image resolves (site assets under /research/<slug>/)
    const imgs = article.locator('img');
    expect(await imgs.count()).toBeGreaterThan(0);
    for (const img of await imgs.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveJSProperty('complete', true);
      expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    }
  });
}

test('card bodies render inline markdown instead of raw asterisks', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/research/?id=dancar');
  await expect(page.locator('main article')).toContainText(
    'beats doing nothing special, and how close',
  );
  await expect(page.locator('main article')).not.toContainText('*and*');
});
