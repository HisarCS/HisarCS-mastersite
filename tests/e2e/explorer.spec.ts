import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { directoryRow, mockSupabase, personRow, researchEntryRow } from './support/supabase';

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

  test('search reaches inside the write-ups, not just titles', async ({ page }) => {
    await openResearch(page);
    // only in Otto's write-up body (its constraint solver)
    await page.getByRole('searchbox', { name: 'Search research' }).fill('Levenberg');
    await expect(status(page)).toContainText('1 of 9 research');
    await expect(page.getByRole('link', { name: /Otto/ })).toBeVisible();
  });

  test("a card's tag filters by it; Clear brings everything back", async ({ page }) => {
    await openResearch(page);
    // a card's own "Robotics" tag (TESTUDO's — Pomelo carries one too)
    await page
      .getByRole('main')
      .getByRole('button', { name: 'Robotics', exact: true })
      .first()
      .click();

    // the Robotics area: Pomelo, TESTUDO, Lemon (biomimetic robots), Automata (mechanics)
    await expect(status(page)).toContainText('4 of 9 research');
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
    await expect(status(page)).toContainText('4 of 9 research');
    await expect(graph.getByRole('link')).toHaveCount(4);

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

  test('near-duplicate tags meet in one interest area (Otto + Parametrix)', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Graph' }).click();
    const graph = page.getByRole('group', { name: 'research by interest' });
    await expect(graph.getByRole('button', { name: /Parametric CAD/ })).toHaveCount(0);
    await graph.getByRole('button', { name: 'Filter by Parametric Design' }).click();
    await expect(graph.getByRole('link')).toHaveCount(2);
    await expect(graph.getByRole('link', { name: 'Open Otto' })).toBeVisible();
    await expect(graph.getByRole('link', { name: 'Open Parametrix' })).toBeVisible();
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
    await expect(status(page)).toContainText('5 of 9 research'); // the Robotics area + Sensor Garden
  });

  test('Obsidian style: dark map, same interactions', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Graph' }).click();
    await page
      .getByRole('group', { name: 'Graph style' })
      .getByRole('button', { name: 'Obsidian' })
      .click();

    const wrap = page.locator('[data-theme="obsidian"]');
    await expect(wrap).toHaveCSS('background-color', 'rgb(30, 30, 36)');
    // WebGPU (animoo) or the SVG fallback — either way the graph works
    await expect(wrap).toHaveAttribute('data-renderer', /^(webgpu|svg)$/);
    const graph = page.getByRole('group', { name: 'research by interest' });
    await graph.getByRole('button', { name: 'Filter by Parametric Design' }).click();
    await expect(status(page)).toContainText('2 of 9 research');
  });

  test('Save PNG downloads the current graph as an image', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Graph' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Save PNG' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('idealab-research-by-interest.png');
    const bytes = readFileSync((await download.path())!);
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
    expect(bytes.length).toBeGreaterThan(10_000); // an actual picture, not an empty canvas
  });

  test('nothing matching shows an honest empty state', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('searchbox', { name: 'Search research' }).fill('zzzz');
    await expect(page.getByText('Nothing matches.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search and filters' }).click();
    await expect(status(page)).toHaveText('9 research');
  });
});

test.describe('shareable explorer links', () => {
  test('a link reopens the same filtered, grouped graph', async ({ page }) => {
    await mockSupabase(page, { researchEntries: [researchEntryRow()] });
    await page.goto('/research/?interest=robotics&by=conference&view=graph&style=obsidian');

    // "robotics" in the link matches the Robotics area, whatever its casing
    await expect(status(page)).toContainText('4 of 9 research');
    await expect(page.getByRole('group', { name: 'research by conference' })).toBeVisible();
    await expect(page.locator('[data-theme="obsidian"]')).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Filter by Interest' }).getByRole('button', {
        name: /^Robotics/,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('changing the view updates the address bar, and Clear cleans it', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('searchbox', { name: 'Search research' }).fill('otto');
    await page
      .getByRole('group', { name: 'Group by' })
      .getByRole('button', { name: 'Year' })
      .click();
    await expect(page).toHaveURL(/\/research\/?\?q=otto&by=year$/);

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await page
      .getByRole('group', { name: 'Group by' })
      .getByRole('button', { name: 'None' })
      .click();
    await expect(page).toHaveURL(/\/research\/?$/);
  });

  test('members open ungrouped from a link, though the yearbook groups by class', async ({
    page,
  }) => {
    await mockSupabase(page, { directory: [directoryRow()] });
    await page.goto('/members/?by=none');
    await expect(page.getByRole('heading', { name: 'Class of 2027' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Ada Lovelace/ })).toBeVisible();
  });
});

test.describe('tags lead to the filtered directory', () => {
  test('a tag on a write-up opens research filtered to its interest area', async ({ page }) => {
    await mockSupabase(page, { researchEntries: [researchEntryRow()] });
    await page.goto('/research/?id=otto');
    await page.getByRole('link', { name: 'Parametric CAD' }).click();
    await expect(page).toHaveURL(/\/research\/?\?interest=Parametric\+Design$/);
    await expect(status(page)).toContainText('2 of 9 research'); // Otto + Parametrix
  });

  test("a venue tag opens that conference's research", async ({ page }) => {
    await mockSupabase(page, { researchEntries: [researchEntryRow()] });
    await page.goto('/research/?id=automata');
    await page.getByRole('link', { name: "Constructionism '25" }).click();
    await expect(status(page)).toContainText('3 of 9 research');
  });

  test("a member entry's tag and a profile's interest are links too", async ({ page }) => {
    await mockSupabase(page, {
      researchEntry: researchEntryRow(),
      person: personRow(),
      directory: [directoryRow()],
    });
    await page.goto('/research/?id=sensor-garden');
    await expect(page.getByRole('link', { name: 'Electronics' })).toHaveAttribute(
      'href',
      /\/research\/?\?interest=Electronics$/,
    );
    await page.goto('/person/?id=ada-lovelace');
    await page.getByRole('link', { name: 'Robotics' }).click();
    await expect(page).toHaveURL(/\/members\/?\?interest=Robotics$/);
  });
});

test.describe('members explorer', () => {
  const MEMBERS = [
    directoryRow(),
    directoryRow({
      id: 'dir-2',
      public_id: 'grace-hopper',
      full_name: 'Grace Hopper',
      cohort: 'alumni',
      graduation_year: 2020,
      fields: ['CS & AI'],
    }),
  ];

  test('an interest chip filters the yearbook', async ({ page }) => {
    await mockSupabase(page, { directory: MEMBERS });
    await page.goto('/members/');
    await page
      .getByRole('group', { name: 'Filter by Interest' })
      .getByRole('button', { name: /^CS & AI/ })
      .click();

    await expect(page.getByRole('link', { name: /Grace Hopper/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ada Lovelace/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Class of 2027' })).toHaveCount(0);
  });

  test('graph view opens a profile on click', async ({ page }) => {
    await mockSupabase(page, { directory: MEMBERS, person: personRow() });
    await page.goto('/members/');
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Graph' }).click();

    const graph = page.getByRole('group', { name: 'members by class' });
    await graph.getByRole('link', { name: 'Open Ada Lovelace' }).click();
    await expect(page).toHaveURL(/\/person\/?\?id=ada-lovelace/);
  });
});
