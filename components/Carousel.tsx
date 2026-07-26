'use client';

import { useLayoutEffect, useRef } from 'react';
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
  kind: 'member' | 'research';
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
 * Cross-fade carousel of cards for the homepage Members/Research modes. This is
 * the resilient baseline (opacity only); the FLIP morph enhancement (3e) and the
 * inline detail modal (3d) layer on top later. Cards currently link to the
 * detail pages.
 */
export function Carousel({
  items,
  label,
  onSelect,
  flip = false,
}: {
  items: CarouselItem[];
  label: string;
  onSelect?: (index: number) => void;
  flip?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // FLIP morph (3e): each card flies in from its matching pixel in the mark.
  // Progressive enhancement — only runs when `flip` (capable desktop); otherwise
  // the CSS cross-fade on .wrap is the baseline. Motion via Web Animations API.
  useLayoutEffect(() => {
    if (!flip) return;
    const track = trackRef.current;
    if (!track) return;
    track.querySelectorAll<HTMLElement>('[data-card]').forEach((card, i) => {
      const mid = card.getAttribute('data-card');
      const pixel = document.querySelector<HTMLElement>(`[data-pixel="${mid}"]`);
      const last = card.getBoundingClientRect();
      if (pixel) {
        const first = pixel.getBoundingClientRect();
        const dx = first.left + first.width / 2 - (last.left + last.width / 2);
        const dy = first.top + first.height / 2 - (last.top + last.height / 2);
        const s = Math.max(0.08, first.width / last.width);
        card.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 460, easing: 'cubic-bezier(.34,1.2,.64,1)', delay: i * 45, fill: 'both' },
        );
      } else {
        card.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 320,
          delay: i * 45,
          fill: 'both',
        });
      }
    });
  }, [flip]);

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
            data-card={it.id}
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
