'use client';

import { useState } from 'react';
import { emptyPage, type PageBlock, type ResearchPage } from '@/lib/domain/blocks';
import type { ResearchFile } from '@/lib/domain/types';
import { BlockRenderer } from './BlockRenderer';
import { BLOCK_DEFS } from './registry';
import styles from './Builder.module.css';

/**
 * Page builder — compose the public page from blocks. Every block row shows a
 * live preview rendered by the SAME renderer the public page uses, with the
 * edit form underneath while a block is open. Pure/controlled: all changes go
 * through onChange; the parent owns saving.
 */
export function PageBuilder({
  page,
  files,
  disabled,
  onChange,
}: {
  page: ResearchPage | null;
  files: ResearchFile[];
  disabled: boolean;
  onChange: (p: ResearchPage) => void;
}) {
  const [open, setOpen] = useState<number | null>(null); // block being edited
  const [picking, setPicking] = useState(false);
  const p = page ?? emptyPage();

  const setBlocks = (blocks: PageBlock[]) => onChange({ ...p, blocks });

  const add = (type: PageBlock['type']) => {
    setBlocks([...p.blocks, BLOCK_DEFS[type].defaults()]);
    setOpen(p.blocks.length);
    setPicking(false);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= p.blocks.length) return;
    const next = [...p.blocks];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setBlocks(next);
    setOpen(null);
  };

  const remove = (i: number) => {
    setBlocks(p.blocks.filter((_, j) => j !== i));
    setOpen(null);
  };

  return (
    <div>
      <p className={styles.help}>
        The page is a stack of blocks — you pick the content and the order, styling is automatic.
        Upload images under <strong>Files</strong> first, then use them in Image/Gallery blocks.
      </p>
      <details className={styles.rules}>
        <summary>Rules & tips</summary>
        <ul>
          <li>Every image needs a caption saying what it shows.</li>
          <li>A chart is an image; state the question it answers in its caption.</li>
          <li>Video: host it on YouTube/Drive (unlisted is fine) and add it as a Link.</li>
          <li>Few, chosen photos beat many. Put the point and the strongest evidence first.</li>
          <li>While the page has no blocks, readers see the Description text instead.</li>
        </ul>
      </details>

      {p.blocks.map((b, i) => {
        const def = BLOCK_DEFS[b.type as PageBlock['type']];
        const problems = def ? def.problems(b) : [];
        return (
          <div key={i} className={styles.blockRow}>
            <div className={styles.blockBar}>
              <span className={styles.blockType}>
                {def?.label ?? b.type}
                {'variant' in b && b.variant ? ` · ${b.variant}` : ''}
              </span>
              <span className={styles.spacer} />
              <button
                className={styles.miniBtn}
                onClick={() => move(i, -1)}
                disabled={disabled || i === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                className={styles.miniBtn}
                onClick={() => move(i, 1)}
                disabled={disabled || i === p.blocks.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                className={styles.miniBtn}
                onClick={() => setOpen(open === i ? null : i)}
                disabled={disabled}
              >
                {open === i ? 'Done' : 'Edit'}
              </button>
              <button
                className={`${styles.miniBtn} ${styles.danger}`}
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label="Delete block"
              >
                ✕
              </button>
            </div>

            {open === i && def && (
              <div className={styles.form}>
                <def.Form
                  block={b}
                  files={files}
                  onChange={(nb) => setBlocks(p.blocks.map((x, j) => (j === i ? nb : x)))}
                />
              </div>
            )}

            {problems.length > 0 && <div className={styles.problems}>✕ {problems.join(' · ')}</div>}

            <div className={styles.preview}>
              {/* the real renderer — what you see is what readers get */}
              <BlockRenderer page={{ version: p.version, blocks: [b] }} />
            </div>
          </div>
        );
      })}

      {p.blocks.length === 0 && (
        <div className={styles.empty}>
          No blocks yet — readers currently see the Description text.
        </div>
      )}

      {picking ? (
        <div className={styles.picker}>
          {(Object.keys(BLOCK_DEFS) as PageBlock['type'][]).map((t) => (
            <button key={t} type="button" className={styles.pickBtn} onClick={() => add(t)}>
              <span className={styles.pickLabel}>{BLOCK_DEFS[t].label}</span>
              <span className={styles.pickHint}>{BLOCK_DEFS[t].hint}</span>
            </button>
          ))}
          <button type="button" className={styles.miniBtn} onClick={() => setPicking(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setPicking(true)}
          disabled={disabled}
        >
          + Add block
        </button>
      )}
    </div>
  );
}

/** All blocking problems across the page — the parent gates saving on this. */
export function pageProblems(page: ResearchPage | null): string[] {
  if (!page) return [];
  return page.blocks.flatMap((b, i) => {
    const def = BLOCK_DEFS[b.type as PageBlock['type']];
    return def ? def.problems(b).map((p) => `block ${i + 1}: ${p}`) : [];
  });
}
