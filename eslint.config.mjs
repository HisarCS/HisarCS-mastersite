import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

// Flat config bridging Next's shareable configs (still eslintrc-style) via
// FlatCompat. `supabase/` (Deno edge functions) and build/static output are
// excluded — they have their own toolchain / aren't ours to lint.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'supabase/**', 'public/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default config;
