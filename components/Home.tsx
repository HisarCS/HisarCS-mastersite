'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMembers } from '@/lib/data/members';
import { mockMembers } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import type { MemberCard } from '@/lib/domain/types';
import { PixelMark } from './PixelMark';
import styles from './Home.module.css';

// Research is a static public/ file, so its link needs basePath prepended.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Homepage shell. Phase 3a: the pixel mark. Members/Projects mode toggles +
 *  the carousel land in the next sub-steps. */
export function Home() {
  const [members, setMembers] = useState<MemberCard[]>([]);

  useEffect(() => {
    // full-screen stage → no page scroll while on the homepage
    document.body.style.overflow = 'hidden';
    let alive = true;
    void (async () => {
      const list = await listMembers();
      if (!alive) return;
      // production renders an honest ink-only mark when empty; local uses mock
      setMembers(list.length ? list : currentEnv() === 'local' ? mockMembers() : []);
    })();
    return () => {
      alive = false;
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.wordmark}>
            idea<span>Lab</span>
          </Link>
          <a href={`${BASE}/research.html`} className={styles.link}>
            Research
          </a>
          <Link href="/member" className={styles.link}>
            One of Us
          </Link>
        </nav>
      </header>

      <PixelMark members={members} />

      <footer className={styles.footer}>
        <div>Hisar School · ideaLab</div>
      </footer>
    </>
  );
}
