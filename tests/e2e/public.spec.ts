import { expect, test } from '@playwright/test';
import { directoryRow, mockSupabase, personRow, researchEntryRow } from './support/supabase';

/**
 * Public read pages — homepage, members index, person profile, research
 * index/write-ups, about — against a mocked backend (real supabase-js on the
 * wire, deterministic rows back).
 */

const TWO_MEMBERS = [
  directoryRow(),
  directoryRow({
    id: 'dir-2',
    public_id: 'grace-hopper',
    full_name: 'Grace Hopper',
    cohort: 'alumni',
    fields: ['CS & AI'],
  }),
];

test('homepage shows the nav, the pixel mark, and the footer', async ({ page }) => {
  await mockSupabase(page, { directory: TWO_MEMBERS });
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Members', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Research', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'About Us' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'One of Us' })).toBeVisible();
  await expect(page.getByText('Hisar School · ideaLab')).toBeVisible();

  // each member from the backend becomes a pixel linking to their profile
  await expect(page.getByRole('link', { name: 'Ada Lovelace — view profile' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Grace Hopper — view profile' })).toBeVisible();
});

test('members index lists backend members and links each card to its profile', async ({ page }) => {
  await mockSupabase(page, { directory: TWO_MEMBERS, person: personRow() });
  await page.goto('/members/');

  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  await expect(page.getByText('Grace Hopper')).toBeVisible();
  await expect(page.getByText('Alumni · CS & AI')).toBeVisible();

  await page.getByRole('link', { name: /Ada Lovelace/ }).click();
  await expect(page).toHaveURL(/\/person\/?\?id=ada-lovelace/);
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
});

test('person page renders the profile from the backend', async ({ page }) => {
  await mockSupabase(page, { person: personRow() });
  await page.goto('/person/?id=ada-lovelace');

  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
  await expect(page.getByText('First programmer, honorary maker.')).toBeVisible();
  await expect(page.getByText('Robotics')).toBeVisible();
  await expect(page.getByText('Analytical Engine')).toBeVisible();
  await expect(page).toHaveTitle('Ada Lovelace — ideaLab');
});

test('research index shows curated write-ups and member research together', async ({ page }) => {
  await mockSupabase(page, { researchEntries: [researchEntryRow()] });
  await page.goto('/research/');

  // curated editorial entries (static data, always present)
  await expect(page.getByText('Parse', { exact: true })).toBeVisible();
  await expect(page.getByText('Otto', { exact: true })).toBeVisible();
  await expect(page.getByText('Pomelo', { exact: true })).toBeVisible();
  // member-created entry from the backend
  await expect(page.getByText('Sensor Garden')).toBeVisible();
  await expect(page.getByText('A courtyard garden that logs its own soil data.')).toBeVisible();
});

test('a curated research card opens its write-up', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/research/');

  await page.getByRole('link', { name: /Parse/ }).first().click();
  await expect(page).toHaveURL(/\/research\/?\?id=parse/);
  await expect(page).toHaveTitle('Parse — ideaLab');
});

test('about page renders', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'About HisarCS' })).toBeVisible();
});

test('header navigation reaches every section from the homepage', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/');

  await page.getByRole('link', { name: 'Members', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();

  await page.getByRole('link', { name: 'Research', exact: true }).click();
  await expect(page).toHaveURL(/\/research\/?$/);

  await page.getByRole('link', { name: 'About Us' }).click();
  await expect(page.getByRole('heading', { name: 'About HisarCS' })).toBeVisible();

  await page.getByRole('link', { name: 'One of Us' }).click();
  await expect(page.getByRole('heading', { name: 'Member sign in' })).toBeVisible();
});
