import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'vendor/**',
      'test-results/**',
      'playwright-report/**',
      'supabase/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['tests/**/*.js', 'playwright.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
