import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite — drives the real static export (`out/`, exactly what GitHub Pages
 * serves) in Chromium, with the Supabase backend mocked at the network edge
 * (tests/e2e/support/supabase.ts). Run `npm run build` first, then `npm run
 * e2e` (or `npm run e2e:build` for both in one go).
 *
 * The server binds 127.0.0.1, so the app's runtime env detection (lib/env.ts)
 * picks the LOCAL backend (http://127.0.0.1:54321) — the exact origin the
 * mocks intercept. No Supabase stack is needed to run these tests.
 */

// Some sandboxes pre-install a Chromium at a fixed path instead of the
// playwright-managed download; use it when present. CI installs its own.
const sandboxChromium = '/opt/pw-browsers/chromium';
const executablePath = !process.env.CI && existsSync(sandboxChromium) ? sandboxChromium : undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx serve out -l 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
