'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { listResearch } from '@/lib/data/research';
import { SiteHeader } from './SiteHeader';
import styles from './ResearchIndex.module.css';

/** Research index — the grid of curated write-ups (replaces public/research.html). */
export function ResearchIndex() {
  const items = listResearch();

  useEffect(() => {
    document.title = 'Research — ideaLab';
  }, []);

  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.eyebrow}>Research &amp; prototypes</div>
        <h1 className={styles.title}>Research</h1>
        <p className={styles.sub}>
          Papers, workshop proposals, and working prototypes out of the lab — parametric design,
          robotics, and applied AI, built by students across a decade of ideaLab work.
        </p>
        <div className={styles.stats}>
          <span className={styles.stat}>{items.length} RESEARCH</span>
          <span className={styles.stat}>2019–2026</span>
          <span className={styles.stat}>IDC · SCF · HRI · HCII · CONSTRUCTIONISM</span>
        </div>

        <div className={styles.grid}>
          {items.map((r) => (
            <Link
              key={r.slug}
              href={`/research?id=${encodeURIComponent(r.slug)}`}
              className={styles.card}
            >
              {r.thumb && (
                <div className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.thumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={styles.thumbImg}
                  />
                </div>
              )}
              <div className={styles.body}>
                {r.venue && <div className={styles.venue}>{r.venue}</div>}
                <div className={styles.cardTitle}>{r.title}</div>
                <p className={styles.desc}>{r.summary}</p>
                {r.tags.length > 0 && (
                  <div className={styles.chips}>
                    {r.tags.slice(0, 3).map((t) => (
                      <span key={t} className={styles.chip}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className={styles.footer}>Hisar School · ideaLab</footer>
    </>
  );
}
