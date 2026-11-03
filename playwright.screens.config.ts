import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * Screenshot gallery — captures every page of the built static export at
 * desktop and phone size, against the same mocked backend as the e2e suite.
 * Not a pass/fail visual diff: CI uploads the images as a browsable gallery
 * on every push so reviewers see each iteration without running anything.
 *
 *   npm run build && npm run screens   →  screens/index.html
 */
export default defineConfig({
  ...base,
  testDir: 'tests/screens',
  retries: 0,
  reporter: 'list',
  use: { ...base.use, reducedMotion: 'reduce' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
