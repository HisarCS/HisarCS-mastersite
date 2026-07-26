'use client';

import { useEffect, useState } from 'react';
import { listMembers } from '@/lib/data/members';
import { mockMembers } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import type { MemberCard } from '@/lib/domain/types';
import { PixelMark } from './PixelMark';
import { SiteHeader } from './SiteHeader';
import styles from './Home.module.css';

/** Homepage: the `.)` pixel mark (with hover cards) as the landing. Browsing
 *  happens on the /members and /research pages, reached from the header. */
export function Home() {
  const [members, setMembers] = useState<MemberCard[]>([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden'; // full-screen stage → no page scroll
    let alive = true;
    void (async () => {
      const m = await listMembers();
      if (!alive) return;
      setMembers(m.length ? m : currentEnv() === 'local' ? mockMembers() : []);
    })();
    return () => {
      alive = false;
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <PixelMark members={members} />
      <footer className={styles.footer}>
        <div>Hisar School · ideaLab</div>
      </footer>
    </>
  );
}
