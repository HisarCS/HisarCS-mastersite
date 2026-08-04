'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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

/** "2026-06-15" → "Jun 2026" (cards show month + year, not the full date). */
const fmtDate = (iso: string | null): string =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en', { month: 'short', year: 'numeric' })
    : '';

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
  /** "Jun 2026" — right-aligned on the venue line (curated venues carry
   *  their year in the venue string instead) */
  date?: string;
  summary?: string;
  thumb: string | null;
  color: string;
  tags: string[];
}

/**
 * One card's tag row. Tags never wrap: overflow scrolls horizontally (trackpad,
 * touch, or plain mouse wheel — vertical wheel delta is translated while the
 * cursor is over the row). Each tag is a button (no action yet) that highlights
 * in its own category color on hover. Rendered even when empty so every card
 * keeps exactly the same height.
 */
function TagRow({ tags }: { tags: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // gradient fades hint at hidden tags: right fade while more waits ahead,
  // left fade once scrolled — neither on rows that fit
  const [fade, setFade] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setFade({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    update();
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault(); // needs a non-passive listener — hence no onWheel prop
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [tags]);
  const cls = [styles.chips, fade.left ? styles.fadeL : '', fade.right ? styles.fadeR : ''].join(
    ' ',
  );
  return (
    <div className={cls} ref={ref}>
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          className={styles.chip}
          style={{ '--chip-c': colorFor(t) } as CSSProperties}
        >
          {t}
        </button>
      ))}
    </div>
  );
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
        subtitle: e.venue || 'ideaLab research',
        date: fmtDate(e.presentedOn) || undefined,
        summary: e.description || undefined,
        thumb: e.avatarUrl,
        color: colorFor(e.id),
        tags: e.tags,
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
            // the card is a div, not a link: tag buttons can't nest inside <a>
            <div key={r.slug} className={styles.card}>
              <Link href={`/research?id=${encodeURIComponent(r.slug)}`} className={styles.cardLink}>
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
                  <div className={styles.venueRow}>
                    <div className={styles.venue}>{r.subtitle}</div>
                    {r.date && <div className={styles.date}>{r.date}</div>}
                  </div>
                  <div className={styles.cardTitle}>{r.title}</div>
                  <p className={styles.desc}>{r.summary}</p>
                </div>
              </Link>
              <TagRow tags={r.tags} />
            </div>
          ))}
        </div>
      </main>
      <footer className={styles.footer}>Hisar School · ideaLab</footer>
    </>
  );
}
