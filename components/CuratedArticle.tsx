'use client';

import { useEffect, useState } from 'react';
import { MarkdownPage } from './markdown/MarkdownPage';
import styles from './ResearchView.module.css';

/** A curated write-up's markdown (public/research/<slug>.md), rendered by the
 *  same renderer as member pages — one look, one set of fences. */
export function CuratedArticle({ src }: { src: string }) {
  const [state, setState] = useState<{ md: string } | 'loading' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    void (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        const md = await res.text();
        if (alive) setState({ md });
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [src]);

  if (state === 'loading')
    return (
      <div className={styles.loading} aria-busy="true">
        <span className={styles.spinner} aria-hidden="true" />
      </div>
    );
  if (state === 'error')
    return <p className={styles.articleError}>This write-up couldn’t be loaded.</p>;
  return <MarkdownPage markdown={state.md} />;
}
