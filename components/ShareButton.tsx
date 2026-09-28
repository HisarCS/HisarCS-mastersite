'use client';

import { useState } from 'react';
import { shareLinkFor } from '@/lib/data/shareable';
import styles from './CiteButton.module.css';

/** "Share" pill: copies the entry's best link (its share page when built). */
export function ShareButton({ slug }: { slug: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const share = async () => {
    const link = await shareLinkFor(slug);
    try {
      await navigator.clipboard.writeText(link);
      setState('copied');
    } catch {
      // clipboard blocked: show the link so it can be copied by hand
      window.prompt('Copy this link', link);
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1500);
  };
  return (
    <button type="button" className={styles.pill} onClick={() => void share()}>
      {state === 'copied' ? 'Link copied ✓' : 'Share'}
    </button>
  );
}
