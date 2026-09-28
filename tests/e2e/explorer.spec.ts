import { expect, test, type Page } from '@playwright/test';
import { mockSupabase, researchEntryRow } from './support/supabase';

/**
 * The directory explorer (components/explorer) on /research and /members:
 * search, filter chips, group-by sections, and the network graph.
 * Research = the eight curated write-ups + one backend entry.
 */

const status = (page: Page) => page.locator('[aria-live="polite"]');

async function openResearch(page: Page) {
  await mockSupabase(page, { researchEntries: [researchEntryRow()] });
  await page.goto('/research/');
  await expect(status(page)).toHaveText('9 research');
}

test.describe('research explorer', () => {
  test('search narrows the grid across titles, summaries, and tags', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('searchbox', { name: 'Search research' }).fill('laser');

    await expect(status(page)).toContainText('1 of 9 research');
    await expect(page.getByRole('link', { name: /Otto/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pomelo/ })).toHaveCount(0);
  });

  test("a card's tag filters by it; Clear brings everything back", async ({ page }) => {
    await openResearch(page);
    // a card's own "Robotics" tag (TESTUDO's — Pomelo carries one too)
    await page
      .getByRole('main')
      .getByRole('button', { name: 'Robotics', exact: true })
      .first()
      .click();

    await expect(status(page)).toContainText('2 of 9 research'); // Pomelo + TESTUDO
    await expect(page.getByRole('link', { name: /TESTUDO/ })).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Filter by Interest' }).getByRole('button', {
        name: /^Robotics/,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(status(page)).toHaveText('9 research');
  });

  test('a venue tag filters by its conference, not the exact year string', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('button', { name: "Constructionism '25" }).first().click();
    await expect(status(page)).toContainText('3 of 9 research');
  });

  test('group by conference sections the grid', async ({ page }) => {
    await openResearch(page);
    await page
      .getByRole('group', { name: 'Group by' })
      .getByRole('button', { name: 'Conference' })
      .click();

    await expect(page.getByRole('heading', { name: /^Constructionism/ })).toContainText('3');
    await expect(page.getByRole('heading', { name: /^SCF/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^HRI/ })).toBeVisible();
  });

  test('graph view: a hub filters, an item opens its page', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Graph' }).click();

    const graph = page.getByRole('group', { name: 'research by interest' });
    await expect(graph).toBeVisible();
    await expect(graph.getByRole('link', { name: 'Open Otto' })).toHaveCount(1);

    await graph.getByRole('button', { name: 'Filter by Robotics' }).click();
    await expect(status(page)).toContainText('2 of 9 research');
    await expect(graph.getByRole('link')).toHaveCount(2);

    await graph.getByRole('link', { name: 'Open Pomelo' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/research\/?\?id=pomelo/);
  });

  test('graph regroups by the chosen facet', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Graph' }).click();
    await page
      .getByRole('group', { name: 'Group by' })
      .getByRole('button', { name: 'Year' })
      .click();

    const graph = page.getByRole('group', { name: 'research by year' });
    await expect(graph.getByRole('button', { name: 'Filter by 2025' })).toBeVisible();
    await expect(graph.getByRole('button', { name: 'Filter by 2019' })).toBeVisible();
  });

  test('tags differing only in case are one filter', async ({ page }) => {
    await mockSupabase(page, {
      researchEntries: [
        researchEntryRow({ research_fields: [{ field_id: 2, fields: { name: 'robotics' } }] }),
      ],
    });
    await page.goto('/research/');
    const chips = page.getByRole('group', { name: 'Filter by Interest' });
    await expect(chips.getByRole('button', { name: /^robotics/i })).toHaveCount(1);
    await chips.getByRole('button', { name: /^Robotics/ }).click();
    await expect(status(page)).toContainText('3 of 9 research'); // Pomelo, TESTUDO, Sensor Garden
  });

  test('nothing matching shows an honest empty state', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('searchbox', { name: 'Search research' }).fill('zzzz');
    await expect(page.getByText('Nothing matches.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search and filters' }).click();
    await expect(status(page)).toHaveText('9 research');
  });
});
