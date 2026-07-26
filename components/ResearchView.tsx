'use client';

import { useEffect, type FC } from 'react';
import Link from 'next/link';
import { getResearchItem, researchContentSrc } from '@/lib/data/research';
import { safeUrl } from '@/lib/util/html';
import type { ResearchItem } from '@/lib/domain/types';
import { SiteHeader } from './SiteHeader';
import { ResearchArticle } from './ResearchArticle';
import { ResearchEntryView } from './ResearchEntryView';
import styles from './ResearchView.module.css';

/**
 * Registry of custom per-item layouts. An item with `view: '<key>'` renders the
 * matching component instead of the default (header + article). Empty for now —
 * the mechanism lets new bespoke layouts drop in without touching ResearchView.
 */
const RESEARCH_VIEWS: Record<string, FC<{ item: ResearchItem; embedded?: boolean }>> = {};

const fmtDates = (item: ResearchItem): string | null => {
  if (item.startDate && item.endDate && item.startDate !== item.endDate)
    return `${item.startDate} – ${item.endDate}`;
  return item.startDate ?? item.endDate ?? null;
};

/** Public research page — a curated write-up with a structured metadata header.
 *  When `embedded` (homepage detail modal) the shared header is omitted. */
export function ResearchView({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const item = getResearchItem(id);

  useEffect(() => {
    if (item) document.title = `${item.title} — ideaLab`;
  }, [item]);

  // Not a curated write-up → treat the slug as a member-created (DB) research
  // entry. This is how /research?id= unifies both kinds of research.
  if (!item) {
    return <ResearchEntryView id={id} embedded={embedded} />;
  }

  const Custom = item.view ? RESEARCH_VIEWS[item.view] : undefined;
  if (Custom) return <Custom item={item} embedded={embedded} />;

  const dates = fmtDates(item);

  return (
    <>
      {!embedded && (
        <>
          <SiteHeader />
          <Link href="/research" className={styles.exit} aria-label="Close and return to research">
            ×
          </Link>
        </>
      )}
      <main className={styles.main}>
        <div className={styles.hero}>
          {item.thumb && (
            <div className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumb} alt="" className={styles.thumbImg} />
            </div>
          )}
          <div>
            <h1 className={styles.title}>{item.title}</h1>
            {item.venue && <div className={styles.venue}>{item.venue}</div>}
            {item.tags.length > 0 && (
              <div className={styles.chips}>
                {item.tags.map((t) => (
                  <span key={t} className={styles.chip}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className={styles.summary}>{item.summary}</p>

        <dl className={styles.meta}>
          {item.authors.length > 0 && (
            <div className={styles.metaRow}>
              <dt>Authors</dt>
              <dd>
                {item.authors.map((a, i) => (
                  <span key={`${a.name}-${i}`}>
                    {i > 0 && ', '}
                    {a.memberId ? (
                      <Link href={`/person?id=${encodeURIComponent(a.memberId)}`}>{a.name}</Link>
                    ) : (
                      a.name
                    )}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {dates && (
            <div className={styles.metaRow}>
              <dt>Date</dt>
              <dd>{dates}</dd>
            </div>
          )}
          {item.location && (
            <div className={styles.metaRow}>
              <dt>Location</dt>
              <dd>{item.location}</dd>
            </div>
          )}
          {item.resources.length > 0 && (
            <div className={styles.metaRow}>
              <dt>Resources</dt>
              <dd className={styles.resources}>
                {item.resources.map((r) => (
                  <a
                    key={`${r.label}-${r.url}`}
                    href={safeUrl(r.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.resource}
                  >
                    ↗ {r.label}
                  </a>
                ))}
              </dd>
            </div>
          )}
        </dl>

        <div className={styles.article}>
          <ResearchArticle src={researchContentSrc(item)} />
        </div>
      </main>
    </>
  );
}
