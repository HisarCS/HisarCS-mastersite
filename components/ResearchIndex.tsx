'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listResearch } from '@/lib/data/research';
import { listResearchEntries } from '@/lib/data/researchEntries';
import { mockResearchEntries } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { avatarSrcSet, researchImgSrcSet, thumbUrl } from '@/lib/util/media';
import { hashStr } from '@/lib/util/hash';
import type { ResearchEntryCard } from '@/lib/domain/types';
import { SiteHeader } from './SiteHeader';
import styles from './ResearchIndex.module.css';

const COLORS = ['#e8542f', '#2f6fe8', '#28a06d', '#c4a11f', '#9048c8', '#d2447e'];
const colorFor = (id: string) => COLORS[hashStr(id) % COLORS.length]!;
const initials = (s: string) =>
  (s || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

interface Card {
  slug: string;
  title: string;
  subtitle: string;
  summary?: string;
  thumb: string | null;
  color: string;
  tags: string[];
}

/** Research index — curated write-ups plus member-created (DB) research, each
 *  card linking to its own /research?id= page. Replaces public/research.html. */
export function ResearchIndex() {
  const curated = useMemo(() => listResearch(), []);
  const [entries, setEntries] = useState<ResearchEntryCard[]>([]);

  useEffect(() => {
    document.title = 'Research — ideaLab';
    let alive = true;
    void (async () => {
      const e = await listResearchEntries();
      if (!alive) return;
      setEntries(e.length ? e : currentEnv() === 'local' ? mockResearchEntries() : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cards: Card[] = useMemo(() => {
    const curatedCards: Card[] = curated.map((r) => ({
      slug: r.slug,
      title: r.title,
      subtitle: r.venue ?? 'Research',
      summary: r.summary,
      thumb: r.thumb ?? null,
      color: colorFor(r.slug),
      tags: r.tags,
    }));
    const seen = new Set(curatedCards.map((c) => c.slug));
    const entryCards: Card[] = entries
      .filter((e) => !seen.has(e.publicId)) // curated wins on slug collision
      .map((e) => ({
        slug: e.publicId,
        title: e.title,
        subtitle: 'ideaLab research',
        thumb: e.avatarUrl,
        color: colorFor(e.id),
        tags: [],
      }));
    return [...curatedCards, ...entryCards];
  }, [curated, entries]);

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
          <span className={styles.stat}>{cards.length} RESEARCH</span>
          <span className={styles.stat}>2019–2026</span>
          <span className={styles.stat}>IDC · SCF · HRI · HCII · CONSTRUCTIONISM</span>
        </div>

        <div className={styles.grid}>
          {cards.map((r) => (
            <Link
              key={r.slug}
              href={`/research?id=${encodeURIComponent(r.slug)}`}
              className={styles.card}
            >
              <div className={styles.thumb} style={{ background: r.color }}>
                {r.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl(r.thumb, 512) ?? ''}
                    srcSet={avatarSrcSet(r.thumb) ?? researchImgSrcSet(r.thumb)}
                    sizes="(max-width: 640px) 94vw, 330px"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={styles.thumbImg}
                  />
                ) : (
                  <span className={styles.thumbInitials}>{initials(r.title)}</span>
                )}
              </div>
              <div className={styles.body}>
                <div className={styles.venue}>{r.subtitle}</div>
                <div className={styles.cardTitle}>{r.title}</div>
                {r.summary && <p className={styles.desc}>{r.summary}</p>}
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
