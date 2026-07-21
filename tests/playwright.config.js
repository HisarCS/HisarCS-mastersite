// Playwright config — e2e tests for backend↔frontend interactions.
// `npm test` (from the repo root) auto-starts the static server; the Supabase
// stack must be running for the live tests (they skip themselves if not).
// Paths are resolved from this file, so the config works living under tests/.
const { defineConfig } = require('@playwright/test');
const path = require('path');
const repoRoot = path.join(__dirname, '..');

module.exports = defineConfig({
  testDir: __dirname,
  testIgnore: ['**/unit/**'], // the tests/ folder itself
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npx serve -l 3000 .',
    cwd: repoRoot, // serve the repo root, not tests/
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
