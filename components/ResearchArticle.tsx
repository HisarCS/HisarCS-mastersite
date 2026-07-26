'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ResearchView.module.css';

/**
 * Renders a preserved research write-up (public/research/<slug>.html) losslessly
 * inside a Shadow DOM: the original page's own <style> and data-URI images are
 * injected verbatim, fully isolated from the site's chrome, so every write-up
 * keeps its own layout. The redundant top nav bar and footer are stripped
 * (SiteHeader + the metadata header provide those). Scripts are never executed
 * (innerHTML), so this is safe for our own trusted content.
 */
export function ResearchArticle({ src }: { src: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    setStatus('loading');
    void (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        const html = await res.text();
        if (!alive) return;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelector('.top')?.remove(); // redundant nav — SiteHeader replaces it
        doc.querySelector('footer')?.remove(); // redundant — site footer/chrome covers it
        // each write-up ships a floating "← Research" back link (position:fixed);
        // ResearchView provides its own exit control, so drop it.
        doc.querySelectorAll('a[style*="position:fixed"]').forEach((el) => el.remove());
        const css = Array.from(doc.querySelectorAll('style'))
          .map((s) => s.outerHTML)
          .join('');
        shadow.innerHTML = `${css}<div class="research-body">${doc.body.innerHTML}</div>`;
        setStatus('ok');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [src]);

  return (
    <>
      <div ref={hostRef} />
      {status === 'loading' && (
        <div className={styles.loading} aria-busy="true">
          <span className={styles.spinner} aria-hidden="true" />
        </div>
      )}
      {status === 'error' && (
        <p className={styles.articleError}>This write-up couldn’t be loaded.</p>
      )}
    </>
  );
}
