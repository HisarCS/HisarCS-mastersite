'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { thumbUrl } from '@/lib/util/media';
import styles from './Carousel.module.css';

export interface CarouselItem {
  id: string;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
  color: string;
  href: string; // kept for accessibility / middle-click / future deep-link
  kind: 'member' | 'project';
  detailId: string; // public_id passed to the detail view in the modal
}

const initials = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * Cross-fade carousel of cards for the homepage Members/Projects modes. This is
 * the resilient baseline (opacity only); the FLIP morph enhancement (3e) and the
 * inline detail modal (3d) layer on top later. Cards currently link to the
 * detail pages.
 */
export function Carousel({
  items,
  label,
  onSelect,
}: {
  items: CarouselItem[];
  label: string;
  onSelect?: (index: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const page = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: 'smooth' });
  };

  if (!items.length) {
    return <div className={styles.empty}>No {label} to show yet.</div>;
  }

  return (
    <div className={styles.wrap} role="region" aria-label={label}>
      <button className={styles.nav} onClick={() => page(-1)} aria-label="Previous">
        ‹
      </button>
      <div className={styles.track} ref={trackRef}>
        {items.map((it, i) => (
          <Link
            key={it.id}
            href={it.href}
            className={styles.card}
            onClick={(e) => {
              if (onSelect) {
                e.preventDefault(); // open the inline modal instead of navigating
                onSelect(i);
              }
            }}
          >
            <div className={styles.avatar} style={{ background: it.color }}>
              {it.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(it.avatarUrl) ?? ''} alt="" decoding="async" />
              ) : (
                initials(it.title)
              )}
            </div>
            <div className={styles.cardTitle}>{it.title}</div>
            <div className={styles.cardSub}>{it.subtitle}</div>
          </Link>
        ))}
      </div>
      <button className={styles.nav} onClick={() => page(1)} aria-label="Next">
        ›
      </button>
    </div>
  );
}
