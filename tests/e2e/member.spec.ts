import { expect, test } from '@playwright/test';
import { GH_LOGIN, mockSupabase, profileRow, seedSession } from './support/supabase';

/**
 * Member area — the auth state machine end to end: signed-out, first sign-in
 * through the org-membership gate (member / not-member / unverifiable),
 * onboarding, dashboard, publish/unpublish, and account deletion. Sessions are
 * seeded into localStorage; every backend answer is mocked at the network edge.
 */

const FIELDS = [
  { id: 1, name: 'Robotics', created_by: null },
  { id: 2, name: 'Ceramics', created_by: null },
];

test('signed out: /member shows the GitHub sign-in card', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/member/');

  await expect(page.getByRole('heading', { name: 'Member sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'One of Us' })).toBeVisible();
});

test('first sign-in of an org member: verification passes, onboarding opens', async ({ page }) => {
  await seedSession(page);
  const mock = await mockSupabase(page, {
    myProfile: null,
    verify: { member: true, state: 'active' },
    fields: FIELDS,
  });
  await page.goto('/member/');

  await expect(page.getByRole('heading', { name: 'Welcome to ideaLab' })).toBeVisible();
  await expect(page.getByText(`@${GH_LOGIN}`).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create my profile' })).toBeVisible();

  // The gate actually ran, and a minimal profile row was created. resolve()
  // fires more than once at sign-in (direct call + INITIAL_SESSION/SIGNED_IN
  // events — a race MemberArea tolerates by design, hence the idempotent,
  // TTL-throttled edge function), so assert "ran", not "ran exactly once".
  expect(mock.calls('verify-org-member')).toBeGreaterThan(0);
  expect(
    mock.requests.some((r) => r.method === 'POST' && r.path.startsWith('/rest/v1/people')),
  ).toBe(true);
});

test('completing onboarding lands on the dashboard', async ({ page }) => {
  await seedSession(page);
  await mockSupabase(page, {
    myProfile: null,
    verify: { member: true, state: 'active' },
    fields: FIELDS,
  });
  await page.goto('/member/');

  await expect(page.getByRole('heading', { name: 'Welcome to ideaLab' })).toBeVisible();
  await page.getByPlaceholder('Your name').fill('Octo Maker');
  await page.getByPlaceholder('2008 and beyond').fill('2027');
  await page.getByRole('button', { name: 'Robotics' }).click();
  await page.getByRole('button', { name: 'Create my profile' }).click();

  await expect(page.getByRole('heading', { name: 'Danger zone' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish my profile' })).toBeVisible();
});

test('a GitHub user outside the org is bounced', async ({ page }) => {
  await seedSession(page, { login: 'intruder', name: 'Not A Member' });
  const mock = await mockSupabase(page, {
    myProfile: null,
    verify: { member: false, state: 'none' },
  });
  await page.goto('/member/');

  await expect(page.getByRole('heading', { name: 'Not one of us — yet' })).toBeVisible();
  await expect(page.getByText('@intruder')).toBeVisible();
  // the bounce also revokes the browser session
  await expect.poll(() => mock.calls('/auth/v1/logout')).toBeGreaterThan(0);
});

test('an unverifiable membership shows the diagnostic screen, not a false "no"', async ({
  page,
}) => {
  await seedSession(page);
  await mockSupabase(page, {
    myProfile: null,
    verify: { status: 500, error: 'GitHub App credentials missing' },
  });
  await page.goto('/member/');

  await expect(
    page.getByRole('heading', { name: "Couldn't verify your membership" }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  // the server's actual error surfaces for debugging
  await expect(page.getByText('GitHub App credentials missing')).toBeVisible();
});

test('a returning member with a complete profile goes straight to the dashboard', async ({
  page,
}) => {
  await seedSession(page);
  const mock = await mockSupabase(page, { myProfile: profileRow() });
  await page.goto('/member/');

  await expect(page.getByRole('heading', { name: 'Danger zone' })).toBeVisible();
  await expect(page.getByRole('link', { name: `@${GH_LOGIN}` })).toBeVisible();
  // an existing profile skips the membership gate (RLS already enforces it)
  expect(mock.calls('verify-org-member')).toBe(0);
});

test('a draft profile can be published and unpublished', async ({ page }) => {
  await seedSession(page);
  await mockSupabase(page, { myProfile: profileRow({ is_published: false }) });
  await page.goto('/member/');

  await page.getByRole('button', { name: 'Publish my profile' }).click();
  await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

  await page.getByRole('button', { name: 'Unpublish' }).click();
  await expect(page.getByRole('button', { name: 'Publish my profile' })).toBeVisible();
});

test('danger zone: deletion requires the exact GitHub handle, then signs out', async ({ page }) => {
  await seedSession(page);
  const mock = await mockSupabase(page, { myProfile: profileRow() });
  await page.goto('/member/');

  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByRole('heading', { name: 'Delete your account?' })).toBeVisible();

  // wrong handle → refused, nothing deleted
  await page.getByPlaceholder('GitHub username').fill('someone-else');
  await page.getByRole('button', { name: 'Delete forever' }).click();
  await expect(page.getByText(/doesn't match/)).toBeVisible();
  expect(mock.calls('delete_my_account')).toBe(0);

  // correct handle → storage purged, RPC runs, session ends at the sign-in card
  await page.getByPlaceholder('GitHub username').fill(`@${GH_LOGIN}`);
  await page.getByRole('button', { name: 'Delete forever' }).click();
  await expect(page.getByRole('heading', { name: 'Member sign in' })).toBeVisible();
  expect(mock.calls('delete_my_account')).toBe(1);
  expect(mock.calls('/storage/v1/object/list/')).toBeGreaterThan(0);
});

test('the shared header reflects the session everywhere and can sign out', async ({ page }) => {
  await seedSession(page);
  await mockSupabase(page, { directory: [] });
  await page.goto('/members/');

  await expect(page.getByRole('link', { name: `@${GH_LOGIN}` })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'One of Us' })).toBeVisible();
});
