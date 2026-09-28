#!/usr/bin/env node
/**
 * One-off: convert the curated write-ups (public/research/<slug>.html — self-
 * contained pages with data-URI images) into markdown pages rendered by the
 * site's own renderer (components/markdown). Kept for reproducibility; the
 * source HTML was removed after conversion — restore it to re-run with
 *   git checkout 3c4450f -- public/research/<slug>.html
 *
 *   node scripts/convert-writeups.mjs [slug …]
 *
 * For each page: images → public/research/<slug>/<n>-<name>-w{800,1600,2400}.jpg
 * (the ladder lib/util/media.ts expects), content → public/research/<slug>.md.
 * The shared template maps onto markdown + the registered fences:
 *   hero tagline/sub → lead · stat chips → ```stats · section heads → ## …
 *   lede → paragraphs · callout → quote · stat tiles → ```tiles
 *   findings → ```findings · spec rows → table · figures → captioned images
 *   *-card / flow-step / level-row → ```cards (+ their photos as a row)
 *   Parse's bar chart → ```chart · tables → GFM tables
 * Anything unrecognized falls back to plain paragraphs and is reported, so
 * each page gets a human pass against the original afterwards.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';

const root = new URL('..', import.meta.url).pathname;
const LADDER = [800, 1600, 2400];
const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['parse', 'otto', 'parametrix', 'testudo', 'automata', 'lemon', 'pomelo', 'dancar'];

const clean = (s) => s.replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/\|/g, '\\|');

/** inline HTML → markdown (bold, italics, code, links, line breaks) */
function inline(node) {
  let out = '';
  for (const n of node.childNodes) {
    if (n.nodeType === 3) out += n.textContent.replace(/\s+/g, ' ');
    else if (n.nodeType === 1) {
      const t = n.tagName.toLowerCase();
      const inner = inline(n);
      if (t === 'strong' || t === 'b') out += inner.trim() ? `**${inner.trim()}**` : '';
      else if (t === 'em' || t === 'i') out += inner.trim() ? `*${inner.trim()}*` : '';
      else if (t === 'code') out += `\`${inner.trim()}\``;
      else if (t === 'a') out += `[${inner.trim()}](${n.getAttribute('href')})`;
      else if (t === 'br') out += '  \n';
      else out += inner;
    }
  }
  return out;
}
const text = (el) => (el ? clean(inline(el)) : '');

async function convert(slug) {
  const html = readFileSync(`${root}public/research/${slug}.html`, 'utf8');
  const doc = new JSDOM(html).window.document;
  doc
    .querySelectorAll('.top, footer, a[style*="position:fixed"], script, style')
    .forEach((e) => e.remove());
  const out = [];
  const unknown = new Set();
  let imgN = 0;
  mkdirSync(`${root}public/research/${slug}`, { recursive: true });

  /** save a data-URI <img> as a width ladder; returns the markdown src */
  async function saveImage(img, hint) {
    const src = img.getAttribute('src') ?? '';
    const m = src.match(/^data:image\/[a-z+]+;base64,(.*)$/);
    if (!m) return src;
    imgN += 1;
    const name = `${String(imgN).padStart(2, '0')}-${
      hint
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32) || 'image'
    }`;
    const buf = Buffer.from(m[1], 'base64');
    for (const w of LADDER)
      await sharp(buf)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(`${root}public/research/${slug}/${name}-w${w}.jpg`);
    return `/research/${slug}/${name}-w2400.jpg`;
  }
  const figure = async (img, caption, placement = '') =>
    `![${esc(caption || img.getAttribute('alt') || '')}](${await saveImage(img, caption || img.getAttribute('alt') || 'figure')}${placement ? ` "${placement}"` : ''})`;

  /** "3 EDITING MODES" → "3 | editing modes"; "OPEN SOURCE" → "Open | source" */
  const chip = (t) => {
    const words = clean(t).split(' ');
    const [value, label] = /\d/.test(words[0])
      ? [words[0], words.slice(1).join(' ')]
      : [words.slice(0, -1).join(' ') || words[0], words.length > 1 ? words.at(-1) : ''];
    const nice =
      value === value.toUpperCase() && !/\d/.test(value)
        ? value[0] + value.slice(1).toLowerCase()
        : value;
    return `${nice} | ${label.toLowerCase() || '—'}`;
  };

  const cardSel = '[class*="-card"], .flow-step, .level-row';
  async function cards(container) {
    const list = [...container.querySelectorAll(cardSel)].filter(
      (c) => !c.parentElement.closest(cardSel),
    );
    const recs = [];
    const photos = [];
    for (const c of list) {
      const label = text(
        c.querySelector('.idx, .m-eyebrow, .num, .n, .level-num, .tag, .creature'),
      );
      const title = text(c.querySelector('h3, h4')) || label || 'Untitled';
      const body = [
        ...c.querySelectorAll(
          'p, .teaches, .readout, .desc, .footnote, .learn, .hw, .ai, .sense, .tag, .species',
        ),
      ]
        .filter((e) => !e.parentElement.closest('p'))
        .filter((e) => text(e) !== label && text(e) !== title)
        // separate lines in the original: end each as a sentence so they don't
        // run together; tag/readout lines ("9 TUTORIALS · CUBE → ROCKET") read
        // as a quiet italic caption
        .map((e) => {
          const t = text(e).replace(/([^.!?…:;"”’)])$/, '$1.');
          return e.matches('.tag, .species, .readout') ? `*${t}*` : t;
        })
        .filter((t, i, all) => t && all.indexOf(t) === i)
        .join(' ');
      const code = c.querySelector('.snippet, .code, pre');
      recs.push(
        `# ${label && label !== title ? `${label} | ` : ''}${title}\n${body}` +
          (code
            ? '\n' +
              code.innerHTML
                .replace(/<br\s*\/?>/g, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&amp;/g, '&')
                .trim()
                .split('\n')
                .map((l) => `> ${l}`)
                .join('\n')
            : ''),
      );
      for (const img of c.querySelectorAll('img'))
        photos.push(await figure(img, img.getAttribute('alt') || title));
    }
    out.push('```cards\n' + recs.join('\n\n') + '\n```');
    if (photos.length) out.push(photos.join('\n'));
  }

  async function block(el) {
    const cls = el.classList;
    const tag = el.tagName.toLowerCase();
    if (cls.contains('hero')) {
      if (el.querySelector('.tagline')) out.push(`**${text(el.querySelector('.tagline'))}**`);
      for (const p of el.querySelectorAll('.sub')) out.push(text(p));
      const chips = [...el.querySelectorAll('.stat-chip')].map((c) => chip(c.textContent));
      if (chips.length) out.push('```stats\n' + chips.join('\n') + '\n```');
      for (const f of el.querySelectorAll('figure'))
        for (const img of f.querySelectorAll('img'))
          out.push(await figure(img, text(f.querySelector('figcaption'))));
      return;
    }
    if (cls.contains('section-head')) {
      const eyebrow = text(el.querySelector('.eyebrow'));
      const h2 = text(el.querySelector('h2'));
      out.push(`## ${eyebrow && h2 ? `${eyebrow} — ${h2}` : eyebrow || h2}`);
      for (const p of el.querySelectorAll('p')) out.push(text(p));
      return;
    }
    if (cls.contains('callout')) return void out.push(`> ${text(el)}`);
    if (tag === 'blockquote') {
      const cite = el.querySelector('cite');
      const who = text(cite);
      cite?.remove();
      return void out.push(`> ${text(el)}${who ? `\n>\n> ${who}` : ''}`);
    }
    if (cls.contains('stat-tiles') || el.querySelector?.(':scope > .stat-tile')) {
      const tiles = [...el.querySelectorAll('.stat-tile')].map(
        (t) => `${text(t.querySelector('.num'))} | ${text(t.querySelector('.label'))}`,
      );
      return void out.push('```tiles\n' + tiles.join('\n') + '\n```');
    }
    if (
      cls.contains('findings-list') ||
      (cls.contains('finding') && !el.closest('.findings-list'))
    ) {
      const items = cls.contains('finding') ? [el] : [...el.querySelectorAll('.finding')];
      const recs = items.map((f) => {
        const g = f.querySelector('.glyph')?.getAttribute('style') ?? '';
        const tone =
          f.classList.contains('friction') || f.classList.contains('limit')
            ? 'issue | '
            : f.classList.contains('alt') || /--m2|--block/.test(g)
              ? 'note | '
              : '';
        return `# ${tone}${text(f.querySelector('h4, h3'))}\n${text(f.querySelector('p'))}`;
      });
      return void out.push('```findings\n' + recs.join('\n\n') + '\n```');
    }
    if (cls.contains('spec-list')) {
      const rows = [...el.querySelectorAll('.spec-row')].map(
        (r) =>
          `| **${esc(text(r.querySelector('.k')).replace(/^./, (c) => c))}** | ${esc(text(r.querySelector('.v')))} |`,
      );
      return void out.push('| | |\n| --- | --- |\n' + rows.join('\n'));
    }
    if (el.querySelector && el.querySelector(':scope > .chart-rows')) {
      const rows = [...el.querySelectorAll('.chart-row')];
      const legend = [...el.querySelectorAll('.legend-item')].map((l) =>
        text(l).replace(/\s*\(.*\)$/, ''),
      );
      const x = rows.map((r) => text(r.querySelector('h4')));
      const pre = rows.map((r) => text(r.querySelector('.val.pre')));
      const post = rows.map((r) =>
        text([...r.querySelectorAll('.val')].find((v) => !v.classList.contains('pre'))),
      );
      // the chart's eyebrow reads as its intro; its heading becomes the question
      const intro = el.querySelector(':scope > .eyebrow, :scope > * > .eyebrow');
      const heading = el.querySelector(':scope > h3, :scope > * > h3');
      if (intro) out.push(text(intro));
      out.push(
        '```chart\ntype: bar\nquestion: ' +
          (text(heading) || 'How did familiarity change? (median, out of 5)') +
          `\nx: ${x.join(', ')}\n${legend[0] || 'Pre'}: ${pre.join(', ')}\n${legend[1] || 'Post'}: ${post.join(', ')}\n\`\`\``,
      );
      intro?.remove();
      heading?.remove();
      el.querySelectorAll(
        '.chart-rows, .legend, .chart-legend, .scale-axis, [class*="legend"]',
      ).forEach((e) => e.remove());
      // fall through for the prose + table around the chart
    }
    if (tag === 'table') {
      const head = [...el.querySelectorAll('thead th')].map((t) => esc(text(t)));
      const body = [...el.querySelectorAll('tbody tr')].map(
        (tr) => `| ${[...tr.children].map((td) => esc(text(td))).join(' | ')} |`,
      );
      return void out.push(
        `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${body.join('\n')}`,
      );
    }
    // any block whose direct children are cards (grids, tracks, step lists…)
    if (el.querySelector(`:scope > :is(${cardSel})`)) return cards(el);
    if (cls.contains('result-nums')) {
      const tiles = [...el.querySelectorAll('.result-num')].map(
        (r) => `${text(r.querySelector('.v'))} | ${text(r.querySelector('.l'))}`,
      );
      return void out.push('```tiles\n' + tiles.join('\n') + '\n```');
    }
    if (cls.contains('lbl')) return void out.push(`**${text(el)}**`);
    if (
      cls.contains('gallery-grid') ||
      (/(^|-)grid$/.test([...cls].find((c) => c.endsWith('grid')) ?? '') &&
        el.querySelectorAll(':scope > figure, :scope > div > img, :scope > .gallery-item').length >=
          2)
    ) {
      const items = [...el.querySelectorAll('img')];
      const figs = [];
      for (const img of items) {
        // each figure's own caption (+ its "Before"/"After" label, if any)
        const own = img.closest('figure, .gallery-item, .photo-item') ?? img.parentElement;
        const label = text(own?.querySelector('.label, .tag, .badge, .stage'));
        const cap = text(own?.querySelector('.cap, figcaption')) || img.getAttribute('alt') || '';
        figs.push(await figure(img, label && !cap.startsWith(label) ? `${label} · ${cap}` : cap));
      }
      return void out.push(figs.join('\n'));
    }
    if (tag === 'figure' || cls.contains('figure-block')) {
      for (const img of el.querySelectorAll('img'))
        out.push(await figure(img, text(el.querySelector('figcaption, .figcap'))));
      return;
    }
    if (tag === 'img') return void out.push(await figure(el, el.getAttribute('alt')));
    if (/^h[1-6]$/.test(tag))
      return void out.push(`${'#'.repeat(Math.max(3, Number(tag[1])))} ${text(el)}`);
    if (tag === 'p') return void out.push(text(el));
    if (tag === 'ul' || tag === 'ol')
      return void out.push(
        [...el.children]
          .map((li, i) => `${tag === 'ol' ? `${i + 1}.` : '-'} ${text(li)}`)
          .join('\n'),
      );
    if (tag === 'details') {
      for (const c of el.children) if (c.tagName.toLowerCase() !== 'summary') await block(c);
      return;
    }
    // containers: recurse; leaves we don't know: keep their text, report
    if (el.children.length) {
      for (const c of el.children) await block(c);
      return;
    }
    const t = text(el);
    if (t) {
      unknown.add(`${tag}.${[...cls].join('.')}`);
      out.push(t);
    }
  }

  const wrap = doc.querySelector('body > .wrap') ?? doc.body;
  for (const c of wrap.children) await block(c);

  const md =
    out
      .filter(Boolean)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n') + '\n';
  writeFileSync(`${root}public/research/${slug}.md`, md);
  console.log(
    `${slug}: ${imgN} images, ${md.length} chars${unknown.size ? ` — review: ${[...unknown].join(', ')}` : ''}`,
  );
}

for (const s of slugs) await convert(s);
