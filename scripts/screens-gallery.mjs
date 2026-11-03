#!/usr/bin/env node
/**
 * Build screens/index.html from the PNGs `npm run screens` wrote — one row per
 * page, desktop beside mobile. Click an image to open it full size.
 */
import { readdirSync, existsSync, writeFileSync } from 'node:fs';

const dir = 'screens';
const projects = ['desktop', 'mobile'].filter((p) => existsSync(`${dir}/${p}`));
if (!projects.length) {
  console.error('no screenshots found — run `npm run screens` first');
  process.exit(1);
}
const pages = [...new Set(projects.flatMap((p) => readdirSync(`${dir}/${p}`)))]
  .filter((f) => f.endsWith('.png'))
  .sort();

const sha = process.env.GITHUB_SHA?.slice(0, 7) ?? 'local';
const ref = process.env.GITHUB_REF_NAME ?? '';
const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const rows = pages
  .map((f) => {
    const cells = projects
      .map((p) =>
        existsSync(`${dir}/${p}/${f}`)
          ? `<figure class="${p}"><a href="${p}/${f}"><img src="${p}/${f}" loading="lazy" alt="${esc(f)} ${p}"></a><figcaption>${p}</figcaption></figure>`
          : '',
      )
      .join('');
    return `<section><h2>${esc(f.replace(/\.png$/, ''))}</h2><div class="row">${cells}</div></section>`;
  })
  .join('\n');

writeFileSync(
  `${dir}/index.html`,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ideaLab screens · ${esc(sha)}</title>
<style>
body{margin:0;background:#f6f4ef;color:#141414;font:14px/1.5 'Helvetica Neue',Helvetica,Arial,sans-serif}
header{padding:28px 32px 10px}h1{font-size:22px;margin:0}header p{color:#8a8578;margin:4px 0 0}
section{padding:18px 32px;border-top:1px solid rgba(0,0,0,.09)}h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#8a8578;margin:0 0 10px}
.row{display:flex;gap:20px;align-items:flex-start;overflow-x:auto}figure{margin:0;flex-shrink:0}
img{display:block;border:1px solid rgba(0,0,0,.12);border-radius:8px;background:#fff}
.desktop img{width:640px}.mobile img{width:206px}figcaption{font-size:11px;color:#8a8578;margin-top:4px}
</style></head><body>
<header><h1>ideaLab — every page, this iteration</h1><p>${esc(ref)} @ ${esc(sha)} · ${pages.length} pages · ${projects.join(' + ')}</p></header>
${rows}
</body></html>
`,
);
console.log(`screens/index.html — ${pages.length} pages × ${projects.length} sizes`);
