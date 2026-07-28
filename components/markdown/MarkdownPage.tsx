'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Element } from 'hast';
import { researchFileUrl } from '@/lib/data/researchEntries';
import { safeUrl } from '@/lib/util/html';
import { parseChartSpec, parsePlacement, parseStatsSpec } from '@/lib/util/chartSpec';
import { ChartSvg } from './ChartSvg';
import styles from './Markdown.module.css';

/**
 * The one renderer for research pages — used by the public page and the editor
 * preview. GFM + KaTeX math + two custom fences (```chart, ```stats) + figure
 * placement via the image title ("left 40", "right", "inset", "wide").
 * Raw HTML in the markdown is never rendered (react-markdown default), and
 * every URL passes safeUrl.
 */

/** image src: uploaded-file storage path, or an external https URL. */
const mediaUrl = (src: string) => (/^https?:\/\//.test(src) ? safeUrl(src) : researchFileUrl(src));

function Figure({ src, caption, title }: { src: string; caption: string; title?: string }) {
  const place = parsePlacement(title);
  const style =
    place.align === 'left' || place.align === 'right' ? { width: `${place.width}%` } : undefined;
  return (
    <figure className={`${styles.figure} ${styles[place.align]}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.img}
        src={mediaUrl(src)}
        alt={caption}
        loading="lazy"
        decoding="async"
      />
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

/** hast helpers for fence + image-paragraph detection */
const fenceInfo = (node: Element | undefined): { lang: string; text: string } | null => {
  const code = node?.children?.[0];
  if (!code || code.type !== 'element' || code.tagName !== 'code') return null;
  const cls = (code.properties?.className as string[] | undefined) ?? [];
  const lang =
    cls
      .find((c) => String(c).startsWith('language-'))
      ?.toString()
      .slice(9) ?? '';
  const text =
    code.children?.[0]?.type === 'text' ? (code.children[0] as { value: string }).value : '';
  return { lang, text };
};

const imageChildren = (node: Element | undefined): Element[] | null => {
  if (!node) return null;
  const meaningful = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
  return meaningful.length > 0 &&
    meaningful.every((c) => c.type === 'element' && c.tagName === 'img')
    ? (meaningful as Element[])
    : null;
};

function FenceError({ fence, error }: { fence: string; error: string }) {
  return (
    <div className={styles.fenceError}>
      ```{fence}: {error}
    </div>
  );
}

export function MarkdownPage({ markdown }: { markdown: string }) {
  return (
    <article className={styles.article}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // fenced code: chart + stats are drawn, everything else is code
          pre({ node, children }) {
            const fence = fenceInfo(node as Element);
            if (fence?.lang === 'chart') {
              const r = parseChartSpec(fence.text);
              if (r.error !== undefined) return <FenceError fence="chart" error={r.error} />;
              return (
                <figure className={`${styles.figure} ${styles.full}`}>
                  <div className={styles.chartCard}>
                    <ChartSvg spec={r.ok} />
                  </div>
                  <figcaption className={styles.caption}>
                    <strong>{r.ok.question}</strong>
                  </figcaption>
                </figure>
              );
            }
            if (fence?.lang === 'stats') {
              const r = parseStatsSpec(fence.text);
              if (r.error !== undefined) return <FenceError fence="stats" error={r.error} />;
              return (
                <div className={styles.chips}>
                  {r.ok.items.map((it, i) => (
                    <span key={i} className={styles.chip}>
                      <b>{it.value}</b> {it.label}
                    </span>
                  ))}
                </div>
              );
            }
            return <pre className={styles.pre}>{children}</pre>;
          },

          // paragraphs that are only images become figures (side by side if 2+)
          p({ node, children }) {
            const imgs = imageChildren(node as Element);
            if (imgs) {
              const figures = imgs.map((im, i) => (
                <Figure
                  key={i}
                  src={String(im.properties?.src ?? '')}
                  caption={String(im.properties?.alt ?? '')}
                  title={im.properties?.title ? String(im.properties.title) : undefined}
                />
              ));
              return imgs.length > 1 ? <div className={styles.row}>{figures}</div> : <>{figures}</>;
            }
            return <p>{children}</p>;
          },

          // an image mixed into a text paragraph: <figure> is invalid inside
          // <p>, so render a plain (float-able) img. Captions need the image on
          // its own line — the p override above turns those into Figures.
          img({ src, alt, title }) {
            const place = parsePlacement(title ?? undefined);
            const style =
              place.align === 'left' || place.align === 'right'
                ? { width: `${place.width}%` }
                : undefined;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={`${styles.img} ${styles[place.align]}`}
                style={style}
                src={mediaUrl(String(src ?? ''))}
                alt={alt ?? ''}
                loading="lazy"
                decoding="async"
              />
            );
          },

          a({ href, children }) {
            return (
              <a href={safeUrl(href ?? '')} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },

          table({ children }) {
            return (
              <div className={styles.tableWrap}>
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
