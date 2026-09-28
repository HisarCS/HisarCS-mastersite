'use client';

import { useRef, useState } from 'react';
import type { ResearchFile } from '@/lib/domain/types';
import { FENCES } from './fences';
import { MarkdownPage } from './MarkdownPage';
import styles from './Editor.module.css';

/** Plain-markdown helpers; fence snippets come from the FENCES registry. */
const SNIPPETS: Record<string, string> = {
  equation: `$$
E = mc^2
$$
`,
  table: `| Column | Column |
| ------ | ------ |
| cell   | cell   |
`,
};

/** Every fence's annotated example, in registry order. */
const FENCE_REFERENCE = Object.values(FENCES)
  .map((def) => def.reference)
  .join('\n\n');

/**
 * Markdown editor for research pages: Write/Preview tabs, insert helpers, and
 * a syntax reference. Preview uses the SAME renderer as the public page.
 * Controlled: the parent owns the markdown string and saving.
 */
export function MarkdownEditor({
  value,
  files,
  disabled,
  onChange,
}: {
  value: string;
  files: ResearchFile[];
  disabled: boolean;
  onChange: (md: string) => void;
}) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [showImages, setShowImages] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const images = files.filter((f) => f.kind === 'image');

  /** insert at the cursor, keeping focus */
  const insert = (snippet: string) => {
    const ta = taRef.current;
    if (!ta) {
      onChange(value + '\n' + snippet);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const pad = start > 0 && value[start - 1] !== '\n' ? '\n\n' : '';
    const next = value.slice(0, start) + pad + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + pad.length + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div>
      <p className={styles.help}>
        The page is one Markdown document — headings, tables, math, charts, and images with
        placement. Upload images under <strong>Files</strong> first, then insert them here.
      </p>

      <div className={styles.bar}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'write' ? styles.on : ''}`}
            onClick={() => setTab('write')}
          >
            Write
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'preview' ? styles.on : ''}`}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
        <span className={styles.spacer} />
        <div className={styles.inserts}>
          <button
            type="button"
            className={styles.ins}
            disabled={disabled}
            onClick={() => setShowImages((s) => !s)}
          >
            Image ▾
          </button>
          {Object.entries(FENCES).map(([lang, def]) => (
            <button
              key={lang}
              type="button"
              className={styles.ins}
              disabled={disabled}
              onClick={() => insert(def.snippet)}
            >
              {def.label}
            </button>
          ))}
          <button
            type="button"
            className={styles.ins}
            disabled={disabled}
            onClick={() => insert(SNIPPETS.equation!)}
          >
            Equation
          </button>
          <button
            type="button"
            className={styles.ins}
            disabled={disabled}
            onClick={() => insert(SNIPPETS.table!)}
          >
            Table
          </button>
        </div>
      </div>

      {showImages && (
        <div className={styles.imageList}>
          {images.length === 0 && (
            <span className={styles.none}>No uploaded images yet — add them under Files.</span>
          )}
          {images.map((f) => (
            <button
              key={f.id}
              type="button"
              className={styles.imageBtn}
              onClick={() => {
                insert(`![${f.caption || 'Caption — what does this show?'}](${f.storagePath})\n`);
                setShowImages(false);
              }}
            >
              {f.caption || f.storagePath.split('/').pop()}
            </button>
          ))}
        </div>
      )}

      {tab === 'write' ? (
        <textarea
          ref={taRef}
          className={styles.ta}
          value={value}
          disabled={disabled}
          spellCheck={false}
          placeholder={'## What happened\n\nWrite the page here…'}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className={styles.previewBox}>
          {value.trim() ? (
            <MarkdownPage markdown={value} />
          ) : (
            <span className={styles.none}>Nothing to preview yet.</span>
          )}
        </div>
      )}

      <details className={styles.cheat}>
        <summary>Syntax reference</summary>
        <pre className={styles.cheatPre}>{`## Section heading          ### Sub-heading
**bold**  *italic*  \`code\`  [label](https://url)

![Caption](image "placement")   placement: full · wide · inset · left 40 · right 40
An image on its own line gets its caption; two on one line render side by side.

Math: $\\alpha = 0.68$ inline, or a $$ block on its own lines.

${FENCE_REFERENCE}

Video: host it on YouTube/Drive (unlisted is fine) and link it:
[Watch the growth time-lapse](https://…)`}</pre>
      </details>
    </div>
  );
}
