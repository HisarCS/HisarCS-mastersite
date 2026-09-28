'use client';

import { useRef, useState } from 'react';
import { toAPA, toBibTeX, type CiteData } from '@/lib/domain/citation';
import styles from './CiteButton.module.css';

const FORMATS = {
  apa: { label: 'APA', render: toAPA },
  bibtex: { label: 'BibTeX', render: toBibTeX },
} as const;
type Format = keyof typeof FORMATS;

/** "Cite" pill → a dialog with APA / BibTeX and a copy button. */
export function CiteButton({ data }: { data: CiteData }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<Format>('apa');
  const [copied, setCopied] = useState(false);
  const text = FORMATS[format].render(data);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (permissions / insecure origin): the text is
      // selectable in the dialog, so the user can still copy by hand
    }
  };

  return (
    <>
      <button type="button" className={styles.pill} onClick={() => dialog.current?.showModal()}>
        Cite
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="cite-heading"
        // click on the backdrop closes
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className={styles.head}>
          <h2 id="cite-heading" className={styles.h}>
            Cite this
          </h2>
          <div className={styles.tabs} role="group" aria-label="Citation format">
            {(Object.keys(FORMATS) as Format[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                className={format === f ? styles.on : ''}
                onClick={() => setFormat(f)}
              >
                {FORMATS[f].label}
              </button>
            ))}
          </div>
        </div>
        <pre className={styles.text} data-testid="citation-text">
          {text}
        </pre>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => void copy()}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button type="button" className={styles.ghost} onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
