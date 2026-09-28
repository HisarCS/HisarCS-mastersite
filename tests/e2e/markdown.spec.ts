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
  await expect(page.locator('article pre')).toHaveCount(0);
});

test('a malformed fence shows its error inline, naming the fence', async ({ page }) => {
  await openPage(page, fence('chart', 'x: a\nS: 1'));
  await expect(page.getByText(/```chart: add a "question:" line/)).toBeVisible();
});

test('an unregistered fence language renders as ordinary code', async ({ page }) => {
  await openPage(page, fence('python', 'print("hi")'));
  await expect(page.locator('article pre')).toContainText('print("hi")');
});

test('tiles fence draws each value above its label', async ({ page }) => {
  await openPage(
    page,
    fence('tiles', '10 | students\n10 / 10 | left with a fabrication-ready model'),
  );

  const tiles = page.locator('article').getByRole('listitem');
  await expect(tiles).toHaveCount(2);
  await expect(tiles.nth(1)).toContainText('10 / 10');
  await expect(tiles.nth(1)).toContainText('left with a fabrication-ready model');
  await expect(page.locator('article pre')).toHaveCount(0);
});

test('findings fence lists each titled result with its body', async ({ page }) => {
  await openPage(
    page,
    fence(
      'findings',
      '# Live feedback made the abstract legible\nWatching it update helped.\n\n# issue | Canvas lag\nQuick edits stuttered.',
    ),
  );

  const items = page.locator('article').getByRole('listitem');
  await expect(items).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Canvas lag' })).toBeVisible();
  await expect(items.nth(1)).toContainText('Quick edits stuttered.');
  // the tone label is markup, not content
  await expect(items.nth(1)).not.toContainText('issue');
});

test('cards fence draws side-by-side cards with label, title, body and snippet', async ({
  page,
}) => {
  await openPage(
    page,
    fence(
      'cards',
      '# 01 — Text | Type the parameters\nWrite shapes directly.\n> shape polygon hex {\n>   sides: 6\n> }\n\n# 02 — Blocks | Snap together logic\nDrag blocks.',
    ),
  );

  const cards = page.locator('article').getByRole('listitem');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('01 — Text');
  await expect(page.getByRole('heading', { name: 'Snap together logic' })).toBeVisible();
  // the snippet keeps its line breaks and indentation
  await expect(cards.first().locator('pre')).toHaveText('shape polygon hex {\n  sides: 6\n}');
});

test('card and finding bodies render inline markdown, links sanitized', async ({ page }) => {
  await openPage(
    page,
    [
      fence('findings', '# Result\nIt worked **twice**, *not* once.'),
      fence('cards', '# Card\nSee [evil](javascript:alert(1)) and [docs](https://example.org).'),
    ].join('\n\n'),
  );
  const article = page.locator('article');
  await expect(article.locator('li strong')).toHaveText('twice');
  await expect(article.locator('li em')).toHaveText('not');
  await expect(article).not.toContainText('**');
  await expect(article.getByRole('link', { name: 'docs' })).toHaveAttribute(
    'href',
    'https://example.org',
  );
  await expect(article.getByRole('link', { name: 'evil' })).not.toHaveAttribute(
    'href',
    /javascript/,
  );
});

test('video fence embeds YouTube in privacy mode; other hosts are refused', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (r) => r.fulfill({ body: 'video' }));
  await openPage(
    page,
    [
      fence('video', 'https://youtu.be/dQw4w9WgXcQ\nThe growth time-lapse'),
      fence('video', 'https://evil.example/watch?v=dQw4w9WgXcQ'),
    ].join('\n\n'),
  );
  const frame = page.locator('article iframe');
  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  await expect(frame).toHaveAttribute('title', 'The growth time-lapse');
  await expect(page.getByText(/```video: only YouTube or Vimeo links/)).toBeVisible();
});

test('timeline fence lists dated milestones in order', async ({ page }) => {
  await openPage(
    page,
    fence('timeline', 'Sep 2024 | First prototype\n2026 | Presented at **IDC**'),
  );
  const items = page.locator('article ol li');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText('Sep 2024');
  await expect(items.nth(1).locator('strong')).toHaveText('IDC');
});

test('compare fence: a before/after slider driven by a range input', async ({ page }) => {
  await openPage(
    page,
    fence(
      'compare',
      '![First drum](/research/parse/05-a.jpg)\n![Two wheels](/research/parse/06-b.jpg)',
    ),
  );
  const slider = page.getByRole('slider', { name: /Before and after/ });
  await expect(slider).toHaveValue('50');
  const before = page.locator('article img[alt="First drum"]');
  await expect(before).toHaveAttribute('style', /inset\(0(px)? 50% 0(px)? 0(px)?\)/);
  await slider.focus();
  await page.keyboard.press('End');
  await expect(before).toHaveAttribute('style', /inset\(0(px)? 0% 0(px)? 0(px)?\)/);
  await expect(page.locator('article figcaption')).toContainText('Before: First drum');
});

test('compare fence needs exactly two images', async ({ page }) => {
  await openPage(page, fence('compare', '![only one](/a.jpg)'));
  await expect(page.getByText(/```compare: add exactly two images/)).toBeVisible();
});
