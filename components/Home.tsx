'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listMembers } from '@/lib/data/members';
import { listProjects } from '@/lib/data/projects';
import { mockMembers, mockProjects } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { hashStr } from '@/lib/util/hash';
import type { MemberCard, ProjectCard } from '@/lib/domain/types';
import { PixelMark } from './PixelMark';
import { Carousel, type CarouselItem } from './Carousel';
import { DetailModal } from './DetailModal';
import styles from './Home.module.css';

// Research is a static public/ file, so its link needs basePath prepended.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const FALLBACK_COLORS = ['#e8542f', '#2f6fe8', '#28a06d', '#c4a11f', '#9048c8', '#d2447e'];
const colorFor = (id: string) => FALLBACK_COLORS[hashStr(id) % FALLBACK_COLORS.length]!;

type Mode = 'mark' | 'members' | 'projects';

/** Homepage: the pixel mark, the Members/Projects carousel modes, and the inline
 *  detail modal (card → full profile with prev/next). */
export function Home() {
  const [members, setMembers] = useState<MemberCard[]>([]);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [mode, setMode] = useState<Mode>('mark');
  const [selected, setSelected] = useState<number | null>(null); // card open in the modal

  useEffect(() => {
    document.body.style.overflow = 'hidden'; // full-screen stage → no page scroll
    let alive = true;
    void (async () => {
      const [m, p] = await Promise.all([listMembers(), listProjects()]);
      if (!alive) return;
      const local = currentEnv() === 'local';
      setMembers(m.length ? m : local ? mockMembers() : []);
      setProjects(p.length ? p : local ? mockProjects() : []);
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
    if (mode === 'projects') {
      return projects.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: 'ideaLab project',
        avatarUrl: p.avatarUrl,
        color: colorFor(p.id),
        href: `/project?id=${encodeURIComponent(p.publicId)}`,
        kind: 'project',
        detailId: p.publicId,
      }));
    }
    return [];
  }, [mode, members, projects]);

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
            className={`${styles.navBtn} ${mode === 'projects' ? styles.active : ''}`}
            onClick={() => switchMode('projects')}
          >
            Projects
          </button>
          <a href={`${BASE}/research.html`} className={styles.link}>
            Research
          </a>
          <Link href="/member" className={styles.link}>
            One of Us
          </Link>
        </nav>
      </header>

      <PixelMark members={members} />

      {mode !== 'mark' && <Carousel items={items} label={mode} onSelect={setSelected} />}

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
