'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMembers } from '@/lib/data/members';
import { mockMembers } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { thumbUrl } from '@/lib/util/media';
import { hashStr } from '@/lib/util/hash';
import type { MemberCard } from '@/lib/domain/types';
import { SiteHeader } from './SiteHeader';
import styles from './CardGrid.module.css';

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

/** Members index — a grid of member cards, each linking to its profile page. */
export function MembersIndex() {
  const [members, setMembers] = useState<MemberCard[]>([]);

  useEffect(() => {
    document.title = 'Members — ideaLab';
    let alive = true;
    void (async () => {
      const m = await listMembers();
      if (!alive) return;
      setMembers(m.length ? m : currentEnv() === 'local' ? mockMembers() : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.eyebrow}>Students &amp; alumni</div>
        <h1 className={styles.title}>Members</h1>
        <p className={styles.sub}>
          The makers of ideaLab — current students and alumni across a decade of the lab.
        </p>

        {members.length === 0 ? (
          <div className={styles.empty}>No members to show yet.</div>
        ) : (
          <div className={styles.grid}>
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/person?id=${encodeURIComponent(m.publicId)}`}
                className={styles.card}
              >
                <div
                  className={styles.avatar}
                  style={{ background: m.avatarColor || colorFor(m.id) }}
                >
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl(m.avatarUrl) ?? ''}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={styles.avatarImg}
                    />
                  ) : (
                    <span className={styles.avatarInitials}>{initials(m.name)}</span>
                  )}
                </div>
                <div className={styles.body}>
                  <div className={styles.cardTitle}>{m.name}</div>
                  <div className={styles.meta}>
                    {m.cohort === 'alumni' ? 'Alumni' : 'Student'}
                    {m.fields[0] ? ` · ${m.fields[0]}` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <footer className={styles.footer}>Hisar School · ideaLab</footer>
    </>
  );
}
