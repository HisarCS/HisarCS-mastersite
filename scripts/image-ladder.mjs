#!/usr/bin/env node
/**
 * Generate responsive-image variants for static assets (committed, not built
 * on CI — the deploy just serves whatever is in public/).
 *
 *   node scripts/image-ladder.mjs public/about [more dirs/files…]
 *
 * For every jpg/jpeg/png that is not itself a variant, writes `<name>-w<W><ext>`
 * siblings for each ladder width smaller than the source (never upscales).
 * Existing up-to-date variants are skipped, so re-running is cheap. Components
 * reference the variants explicitly in their srcset.
 */
import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const LADDER = [800, 1600, 2400];
const IMG_RE = /\.(jpe?g|png)$/i;
const VARIANT_RE = /-w\d+\.(jpe?g|png)$/i;

async function* walk(p) {
  const s = await stat(p);
  if (s.isDirectory()) {
    for (const entry of await readdir(p)) yield* walk(path.join(p, entry));
  } else if (IMG_RE.test(p) && !VARIANT_RE.test(p)) {
    yield p;
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/image-ladder.mjs <dir-or-file>…');
  process.exit(1);
}

let made = 0;
for (const root of args) {
  for await (const file of walk(root)) {
    const img = sharp(file);
    const { width } = await img.metadata();
    const ext = path.extname(file);
    const stem = file.slice(0, -ext.length);
    const widths = LADDER.filter((w) => w < (width ?? 0));
    const out = [];
    for (const w of widths) {
      const target = `${stem}-w${w}${ext}`;
      if (existsSync(target)) continue;
      await img
        .clone()
        .resize(w)
        .toFormat(ext.toLowerCase() === '.png' ? 'png' : 'jpeg', { quality: 85 })
        .toFile(target);
      out.push(w);
      made++;
    }
    console.log(
      `${file} (${width}px) → ${out.length ? out.map((w) => `w${w}`).join(' ') : 'no variants needed'}`,
    );
  }
}
console.log(`${made} variant(s) written`);
