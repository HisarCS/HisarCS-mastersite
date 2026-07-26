'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { buildGrid, computeLayout, seededCellOrder } from '@/lib/homepage/mark';
import { hashStr } from '@/lib/util/hash';
import { thumbUrl } from '@/lib/util/media';
import type { MemberCard } from '@/lib/domain/types';
import styles from './PixelMark.module.css';

const FALLBACK_COLORS = ['#e8542f', '#2f6fe8', '#28a06d', '#c4a11f', '#9048c8', '#d2447e'];
const SHAPES = ['vSq', 'vCir', 'vC0', 'vC1', 'vC2', 'vC3'] as const;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const colorFor = (m: MemberCard) =>
  m.avatarColor || FALLBACK_COLORS[hashStr(m.id) % FALLBACK_COLORS.length]!;

interface Hover {
  m: MemberCard;
  anchor: DOMRect;
}

/** The homepage pixel mark: one pixel per published member, the rest ink. */
export function PixelMark({ members }: { members: MemberCard[] }) {
  const grid = useMemo(() => buildGrid(), []);
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // seeded, stable assignment of members → pixels
  const assignments = useMemo(() => {
    const order = seededCellOrder(grid.cells.length);
    const map = new Map<number, MemberCard>();
    members.forEach((m, i) => {
      if (i < order.length) map.set(order[i]!, m);
    });
    return map;
  }, [grid, members]);

  const showHover = (m: MemberCard, el: HTMLElement) => {
    window.clearTimeout(hideTimer.current);
    setHover({ m, anchor: el.getBoundingClientRect() });
  };
  const hideSoon = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setHover(null), 180);
  };

  if (!vp) return <div className={styles.stage} />;
  const { cell, gap, originX, originY } = computeLayout(vp.w, vp.h, grid);
  const size = cell - gap;

  return (
    <div className={styles.stage}>
      {grid.cells.map((cellRef, idx) => {
        const pos = {
          left: originX + cellRef.c * cell + gap / 2,
          top: originY + cellRef.r * cell + gap / 2,
          width: size,
          height: size,
        };
        const person = assignments.get(idx);
        if (!person) {
          return <div key={idx} className={`${styles.pixel} ${styles.filler}`} style={pos} />;
        }
        const shape = SHAPES[hashStr(person.id) % SHAPES.length]!;
        return (
          <Link
            key={idx}
            href={`/person?id=${encodeURIComponent(person.publicId)}`}
            className={`${styles.pixel} ${styles.person} ${styles[shape]}`}
            style={{ ...pos, ['--cell' as string]: `${size}px` } as React.CSSProperties}
            data-pixel={person.id}
            aria-label={`${person.name} — view profile`}
            onMouseEnter={(e) => showHover(person, e.currentTarget)}
            onMouseLeave={hideSoon}
            onFocus={(e) => showHover(person, e.currentTarget)}
            onBlur={hideSoon}
          >
            <div className={styles.cell} style={{ background: colorFor(person) }}>
              {person.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(person.avatarUrl) ?? ''} alt="" decoding="async" />
              ) : (
                <span className={styles.initials}>{initialsOf(person.name)}</span>
              )}
            </div>
          </Link>
        );
      })}

      {hover && (
        <HoverCard
          member={hover.m}
          anchor={hover.anchor}
          onEnter={() => window.clearTimeout(hideTimer.current)}
          onLeave={hideSoon}
        />
      )}
    </div>
  );
}

function HoverCard({
  member,
  anchor,
  onEnter,
  onLeave,
}: {
  member: MemberCard;
  anchor: DOMRect;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    const M = 10;
    let left = anchor.left + anchor.width / 2 - cw / 2;
    left = Math.max(M, Math.min(left, window.innerWidth - cw - M));
    let top = anchor.top - ch - 14;
    if (top < M) top = anchor.bottom + 14;
    setPos({ left, top });
  }, [anchor]);

  const role = member.cohort === 'alumni' ? 'Alumni' : 'Student';
  const discipline = member.fields[0] || 'Maker';

  return (
    <div
      ref={ref}
      className={`${styles.card} ${pos ? styles.cardShow : ''}`}
      style={pos ?? { left: -9999, top: -9999 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className={styles.cardRow}>
        <div className={styles.cardAvatar} style={{ background: colorFor(member) }}>
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl(member.avatarUrl) ?? ''} alt="" decoding="async" />
          ) : (
            initialsOf(member.name)
          )}
        </div>
        <div>
          <div className={styles.cardName}>{member.name}</div>
          <div className={styles.cardRole}>
            {role} · {discipline}
          </div>
        </div>
      </div>
      <span className={`${styles.badge} ${member.cohort === 'alumni' ? styles.alumni : ''}`}>
        {member.cohort === 'alumni' ? 'Alumni' : 'Current Student'}
      </span>
      <Link
        className={styles.profileLink}
        href={`/person?id=${encodeURIComponent(member.publicId)}`}
      >
        View profile →
      </Link>
    </div>
  );
}
