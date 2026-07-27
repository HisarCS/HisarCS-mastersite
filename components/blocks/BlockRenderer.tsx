'use client';

import type { ReactNode } from 'react';
import { researchFileUrl } from '@/lib/data/researchEntries';
import { safeUrl } from '@/lib/util/html';
import type { PageBlock, ResearchPage } from '@/lib/domain/blocks';
import styles from './Blocks.module.css';

/**
 * The one renderer for composed research pages — used by the public page and
 * the editor preview, so what you compose is exactly what readers get.
 * Unknown block types render nothing (but are preserved in the data).
 */

/** media src: external https URL, or a research-files storage path. */
const mediaUrl = (src: string) => (/^https?:\/\//.test(src) ? safeUrl(src) : researchFileUrl(src));

/** Markdown-lite inline rendering without innerHTML: **bold**, *italic*,
 *  `code`, [label](url). Everything else is plain text. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2]) out.push(<strong key={k++}>{m[2]}</strong>);
    else if (m[4]) out.push(<em key={k++}>{m[4]}</em>);
    else if (m[6]) out.push(<code key={k++}>{m[6]}</code>);
    else if (m[8])
      out.push(
        <a
          key={k++}
          className={styles.mdLink}
          href={safeUrl(m[9]!)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {m[8]}
        </a>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Fig({ src, caption, className }: { src: string; caption: string; className?: string }) {
  return (
    <figure className={`${styles.figure} ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.img}
        src={mediaUrl(src)}
        alt={caption}
        loading="lazy"
        decoding="async"
      />
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}

function Block({ block }: { block: PageBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div className={`${styles.text} ${block.variant === 'lede' ? styles.lede : ''}`}>
          {block.data.heading && <h2 className={styles.h}>{block.data.heading}</h2>}
          {block.data.md
            .split(/\n\s*\n/)
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i}>{inline(p.trim())}</p>
            ))}
        </div>
      );

    case 'media':
      return (
        <Fig
          src={block.data.src}
          caption={block.data.caption}
          className={block.variant === 'inset' ? styles.inset : ''}
        />
      );

    case 'gallery': {
      const cls =
        block.variant === 'pair'
          ? styles.pair
          : block.variant === 'sequence'
            ? styles.seq
            : styles.grid2;
      return (
        <div className={cls}>
          {block.data.items.map((it, i) => (
            <Fig key={i} src={it.src} caption={it.caption} />
          ))}
        </div>
      );
    }

    case 'numbers':
      return block.variant === 'tiles' ? (
        <div className={styles.tiles}>
          {block.data.items.map((it, i) => (
            <div key={i} className={styles.tile}>
              <div className={styles.num}>{it.value}</div>
              <div className={styles.lbl}>{it.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.chips}>
          {block.data.items.map((it, i) => (
            <span key={i} className={styles.chip}>
              <b>{it.value}</b> {it.label}
            </span>
          ))}
        </div>
      );

    case 'table':
      return (
        <div>
          {block.data.heading && <h2 className={styles.h}>{block.data.heading}</h2>}
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${block.variant === 'kv' ? styles.kv : ''}`}>
              {block.data.header.some((h) => h.trim()) && (
                <thead>
                  <tr>
                    {block.data.header.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {block.data.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.data.note && <div className={styles.note}>{block.data.note}</div>}
        </div>
      );

    case 'list': {
      const items = block.data.items.filter((it) => it.trim());
      return (
        <div>
          {block.data.heading && <h2 className={styles.h}>{block.data.heading}</h2>}
          {block.variant === 'bulleted' ? (
            <ul className={styles.ul}>
              {items.map((it, i) => (
                <li key={i}>{inline(it)}</li>
              ))}
            </ul>
          ) : (
            <ol className={block.variant === 'numbered' ? styles.olPlain : styles.steps}>
              {items.map((it, i) => (
                <li key={i}>{inline(it)}</li>
              ))}
            </ol>
          )}
        </div>
      );
    }

    case 'quote':
      return (
        <blockquote className={styles.quote}>
          {block.data.text}
          {block.data.attribution && (
            <footer className={styles.attr}>— {block.data.attribution}</footer>
          )}
        </blockquote>
      );

    case 'code':
      return (
        <div>
          {block.data.language && <div className={styles.lang}>{block.data.language}</div>}
          <pre className={styles.code}>{block.data.body}</pre>
        </div>
      );

    case 'links': {
      const items = block.data.items.filter((it) => it.url && it.label);
      return (
        <div className={block.variant === 'list' ? styles.linkList : styles.linkRow}>
          {items.map((it, i) => (
            <a
              key={i}
              className={styles.linkBtn}
              href={safeUrl(it.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {it.kind && <span className={styles.kind}>{it.kind}</span>} {it.label}
            </a>
          ))}
        </div>
      );
    }

    default:
      return null; // unknown type: render nothing, data preserved elsewhere
  }
}

export function BlockRenderer({ page }: { page: ResearchPage }) {
  return (
    <>
      {page.blocks.map((b, i) => (
        <section key={i} className={styles.block}>
          <Block block={b} />
        </section>
      ))}
    </>
  );
}
