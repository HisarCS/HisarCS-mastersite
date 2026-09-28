'use client';

import { useEffect, type FC } from 'react';
import Link from 'next/link';
import { getResearchItem, researchContentSrc, researchPageUrl } from '@/lib/data/research';
import { safeUrl } from '@/lib/util/html';
import type { ResearchItem } from '@/lib/domain/types';
import { citationFromCurated } from '@/lib/domain/citation';
import { researchTagFilter } from '@/lib/domain/directoryFacets';
import { explorerLink } from '@/lib/domain/explorerUrl';
import { CiteButton } from './CiteButton';
import { useInterestTable } from './useInterestTable';
import { ShareButton } from './ShareButton';
import { SiteHeader } from './SiteHeader';
import { CuratedArticle } from './CuratedArticle';
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
  const areas = useInterestTable();

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
            <h1 className={styles.title}>
              {item.title}
              <CiteButton data={citationFromCurated(item, researchPageUrl(item.slug))} />
              <ShareButton slug={item.slug} />
            </h1>
            {item.venue && <div className={styles.venue}>{item.venue}</div>}
            {item.tags.length > 0 && (
              <div className={styles.chips}>
                {item.tags.map((t) => {
                  const { facet, value } = researchTagFilter(t, areas);
                  return (
                    <Link
                      key={t}
                      href={explorerLink('/research', facet, value)}
                      title={`All research in ${value}`}
                      className={styles.chip}
                    >
                      {t}
                    </Link>
                  );
                })}
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
          <CuratedArticle src={researchContentSrc(item)} />
        </div>
      </main>
    </>
  );
}
