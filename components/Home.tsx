'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { listMembers } from '@/lib/data/members';
import { listResearch } from '@/lib/data/research';
import { mockMembers } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { pickTransition } from '@/lib/homepage/motion';
import { hashStr } from '@/lib/util/hash';
import type { MemberCard } from '@/lib/domain/types';
import { PixelMark } from './PixelMark';
import { Carousel, type CarouselItem } from './Carousel';
import { DetailModal } from './DetailModal';
import styles from './Home.module.css';

const FALLBACK_COLORS = ['#e8542f', '#2f6fe8', '#28a06d', '#c4a11f', '#9048c8', '#d2447e'];
const colorFor = (id: string) => FALLBACK_COLORS[hashStr(id) % FALLBACK_COLORS.length]!;

type Mode = 'mark' | 'members' | 'research';

/** Homepage: the pixel mark, the Members/Research carousel modes, and the inline
 *  detail modal (card → full profile/write-up with prev/next). */
export function Home() {
  const [members, setMembers] = useState<MemberCard[]>([]);
  const [mode, setMode] = useState<Mode>('mark');
  const [selected, setSelected] = useState<number | null>(null); // card open in the modal
  const [flip, setFlip] = useState(false); // FLIP vs cross-fade, decided client-side
  const [pendingDetail, setPendingDetail] = useState<string | null>(null); // detail id from the hash, awaiting items
  const mounted = useRef(false);

  // Curated research is static content — no fetch needed.
  const research = useMemo(() => listResearch(), []);

  useEffect(() => {
    document.body.style.overflow = 'hidden'; // full-screen stage → no page scroll
    setFlip(pickTransition() === 'flip');
    let alive = true;
    void (async () => {
      const m = await listMembers();
      if (!alive) return;
      const local = currentEnv() === 'local';
      setMembers(m.length ? m : local ? mockMembers() : []);
    })();
    return () => {
      alive = false;
      document.body.style.overflow = '';
    };
  }, []);

  const items: CarouselItem[] = useMemo(() => {
    if (mode === 'members') {
      return members.map((m) => ({
        id: m.id,
        title: m.name,
        subtitle: `${m.cohort === 'alumni' ? 'Alumni' : 'Student'} · ${m.fields[0] || 'Maker'}`,
        avatarUrl: m.avatarUrl,
        color: m.avatarColor || colorFor(m.id),
        href: `/person?id=${encodeURIComponent(m.publicId)}`,
        kind: 'member',
        detailId: m.publicId,
      }));
    }
    if (mode === 'research') {
      return research.map((r) => ({
        id: r.slug,
        title: r.title,
        subtitle: r.venue ?? 'Research',
        avatarUrl: r.thumb ?? null,
        color: colorFor(r.slug),
        href: `/research?id=${encodeURIComponent(r.slug)}`,
        kind: 'research',
        detailId: r.slug,
      }));
    }
    return [];
  }, [mode, members, research]);

  // Keyboard: modal open → Esc closes, ←/→ step cards; carousel mode (no modal)
  // → Esc returns to the mark. Centralized so it composes with the mode state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected !== null) {
        if (e.key === 'Escape') setSelected(null);
        else if (e.key === 'ArrowLeft') setSelected((i) => Math.max(0, (i ?? 0) - 1));
        else if (e.key === 'ArrowRight')
          setSelected((i) => Math.min(items.length - 1, (i ?? 0) + 1));
      } else if (mode !== 'mark' && e.key === 'Escape') {
        setMode('mark');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, mode, items.length]);

  // --- hash routing: #members · #members/<public_id> · #research/<slug> ---
  // hash → state: initial deep-link + browser back/forward (popstate).
  useEffect(() => {
    const apply = () => {
      const [m, detail] = window.location.hash.replace(/^#/, '').split('/');
      if (m === 'members' || m === 'research') {
        setMode(m);
        setPendingDetail(detail ?? null);
        if (!detail) setSelected(null);
      } else {
        setMode('mark');
        setSelected(null);
        setPendingDetail(null);
      }
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, []);

  // resolve a pending detail id (from the hash) to a card index once items load
  useEffect(() => {
    if (pendingDetail == null) return;
    const idx = items.findIndex((it) => it.detailId === pendingDetail);
    if (idx >= 0) {
      setSelected(idx);
      setPendingDetail(null);
    }
  }, [items, pendingDetail]);

  // state → hash. pushState is silent (fires no popstate), so there's no loop;
  // the diff-check covers back/forward, and we skip the first render so a
  // deep-link hash isn't wiped before it's applied.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    let hash = '';
    if (mode !== 'mark') {
      hash = '#' + mode;
      if (selected !== null && items[selected]) hash += '/' + items[selected]!.detailId;
    }
    if (hash !== window.location.hash) {
      window.history.pushState(null, '', hash || window.location.pathname + window.location.search);
    }
  }, [mode, selected, items]);

  const switchMode = (m: Mode) => {
    setSelected(null);
    setMode((cur) => (cur === m ? 'mark' : m));
  };

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.wordmark} onClick={() => switchMode('mark')}>
            idea<span>Lab</span>
          </Link>
          <button
            className={`${styles.navBtn} ${mode === 'members' ? styles.active : ''}`}
            onClick={() => switchMode('members')}
          >
            Members
          </button>
          <button
            className={`${styles.navBtn} ${mode === 'research' ? styles.active : ''}`}
            onClick={() => switchMode('research')}
          >
            Research
          </button>
          <Link href="/member" className={styles.link}>
            One of Us
          </Link>
        </nav>
      </header>

      <PixelMark members={members} />

      {mode !== 'mark' && (
        <>
          <button
            className={styles.exit}
            onClick={() => {
              setSelected(null);
              setMode('mark');
            }}
            aria-label="Exit and return to the mark"
          >
            ✕ Exit
          </button>
          <Carousel items={items} label={mode} onSelect={setSelected} flip={flip} />
        </>
      )}

      {selected !== null && (
        <DetailModal
          items={items}
          index={selected}
          onClose={() => setSelected(null)}
          onPrev={() => setSelected((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setSelected((i) => Math.min(items.length - 1, (i ?? 0) + 1))}
        />
      )}

      <footer className={styles.footer}>
        <div>Hisar School · ideaLab</div>
      </footer>
    </>
  );
}
