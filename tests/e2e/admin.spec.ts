import { expect, test, type Page } from '@playwright/test';
import { GH_LOGIN, mockSupabase, profileRow, seedSession } from './support/supabase';

/**
 * /admin — publish queue, admin allowlist, interest areas (ADR-0022). The
 * database is the real gate; these check the panel offers the right things to
 * the right people and sends the right writes.
 */

const signedIn = async (page: Page, opts: Parameters<typeof mockSupabase>[1] = {}) => {
  await seedSession(page);
  return mockSupabase(page, { myProfile: profileRow({ is_published: true }), ...opts });
};

test.describe('who gets in', () => {
  test('signed out: asked to sign in', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/admin/');
    await expect(page.getByText(/Sign in with an admin/)).toBeVisible();
  });

  test('a member who is not an admin: "Admins only", and no Admin link', async ({ page }) => {
    await signedIn(page, { isAdmin: false });
    await page.goto('/admin/');
    await expect(page.getByText('Admins only')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  });

  test('an admin sees the Admin link in the header', async ({ page }) => {
    await signedIn(page, { isAdmin: true });
    await page.goto('/members/');
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Admin', level: 1 })).toBeVisible();
  });
});

test('publish queue: publish a profile and a research draft', async ({ page }) => {
  const api = await signedIn(page, {
    isAdmin: true,
    unpublishedPeople: [
      { id: 'p-9', public_id: 'grace', full_name: 'Grace Hopper', graduation_year: 2027 },
      { id: 'p-8', public_id: 'no-year', full_name: 'No Year Yet', graduation_year: null },
    ],
    draftResearch: [{ id: 'r-9', public_id: 'pixel-wall', title: 'Pixel Wall' }],
  });
  await page.goto('/admin/');

  // can't publish without a graduation year (the DB would refuse it too)
  await expect(page.getByRole('button', { name: 'Publish No Year Yet' })).toBeDisabled();

  await page.getByRole('button', { name: 'Publish Grace Hopper' }).click();
  await expect(page.getByRole('button', { name: 'Publish Grace Hopper' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Publish Pixel Wall' }).click();
  await expect(page.getByText('No research drafts.')).toBeVisible();

  expect(api.calls('/rest/v1/people?id=eq.p-9')).toBe(1);
  expect(api.calls('/rest/v1/research?id=eq.r-9')).toBe(1);
});

test('admins: add someone, remove someone — never yourself or the last one', async ({ page }) => {
  await signedIn(page, { isAdmin: true, admins: [GH_LOGIN, 'kmert10'] });
  await page.goto('/admin/');
  await page.getByRole('tab', { name: 'Admins' }).click();

  await expect(page.getByRole('button', { name: `Remove @${GH_LOGIN}` })).toBeDisabled();

  await page.getByLabel('GitHub username to make an admin').fill('  @NewPerson ');
  await page.getByRole('button', { name: 'Add admin' }).click();
  await expect(page.getByRole('link', { name: '@newperson' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove @kmert10' }).click();
  await expect(page.getByRole('link', { name: '@kmert10' })).toHaveCount(0);

  await page.getByLabel('GitHub username to make an admin').fill('not a login!');
  await page.getByRole('button', { name: 'Add admin' }).click();
  await expect(page.getByText(/isn't a GitHub username/)).toBeVisible();
});

test('interest areas: add, move, remove a tag; rename and create areas', async ({ page }) => {
  await signedIn(page, {
    isAdmin: true,
    interestAreas: [
      { area: 'Robotics', tag: 'robotics', sort: 0 },
      { area: 'Making', tag: 'laser cutting', sort: 1 },
    ],
  });
  await page.goto('/admin/');
  await page.getByRole('tab', { name: 'Interest areas' }).click();
  const making = page.getByRole('region', { name: 'Area Making' });

  await making.getByLabel('Tag to add to Making').fill('  3D   Printing ');
  await making.getByRole('button', { name: 'Add' }).click();
  await expect(making.getByText('3d printing')).toBeVisible();

  await making.getByLabel('Move laser cutting to another area').selectOption('Robotics');
  await expect(
    page.getByRole('region', { name: 'Area Robotics' }).getByText('laser cutting'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Rename Robotics' }).click();
  await page.getByLabel('New name for Robotics').fill('Robotics & Making');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('region', { name: 'Area Robotics & Making' })).toBeVisible();

  await page.getByLabel('New area name').fill('Bio');
  await page.getByLabel('First tag for the new area').fill('Biodesign');
  await page.getByRole('button', { name: 'Create area' }).click();
  await expect(page.getByRole('region', { name: 'Area Bio' }).getByText('biodesign')).toBeVisible();

  await page
    .getByRole('region', { name: 'Area Bio' })
    .getByRole('button', { name: 'Remove biodesign from Bio' })
    .click();
  await expect(page.getByRole('region', { name: 'Area Bio' })).toHaveCount(0);
});
