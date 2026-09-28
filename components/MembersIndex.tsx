'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listMembers } from '@/lib/data/members';
import { mockMembers } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { avatarSrcSet, thumbUrl } from '@/lib/util/media';
import { initials, paletteColor as colorFor } from '@/lib/util/palette';
import type { MemberCard } from '@/lib/domain/types';
import { SiteHeader } from './SiteHeader';
import styles from './CardGrid.module.css';

/** Classes newest first, unlabelled members last; alphabetical inside a class. */
function groupByClass(members: MemberCard[]): { year: number | null; list: MemberCard[] }[] {
  const by = new Map<number | null, MemberCard[]>();
  for (const m of members) {
    const y = m.gradYear ?? null;
    const list = by.get(y);
    if (list) list.push(m);
    else by.set(y, [m]);
  }
  return [...by.entries()]
    .sort(([a], [b]) => (b ?? -Infinity) - (a ?? -Infinity))
    .map(([year, list]) => ({
      year,
      list: [...list].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

/**
 * Members index — a classic yearbook: one row of portraits per graduating
 * class, newest class first, kept deliberately minimal (a hairline rule and a
 * small-caps class label per row).
 */
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

  const classes = useMemo(() => groupByClass(members), [members]);

  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.eyebrow}>Students &amp; alumni</div>
        <h1 className={styles.title}>Members</h1>
        <p className={styles.sub}>
          The makers of ideaLab, class by class — current students and alumni across a decade of the
          lab.
        </p>

        {members.length === 0 ? (
          <div className={styles.empty}>No members to show yet.</div>
        ) : (
          classes.map(({ year, list }) => (
            <section key={year ?? 'other'} className={styles.classSection}>
              <h2 className={styles.classHeading}>{year ? `Class of ${year}` : 'ideaLab'}</h2>
              <div className={styles.portraitRow}>
                {list.map((m) => (
                  <Link
                    key={m.id}
                    href={`/person?id=${encodeURIComponent(m.publicId)}`}
                    className={styles.portrait}
                  >
                    <span
                      className={styles.photo}
                      style={{ background: m.avatarColor || colorFor(m.id) }}
                    >
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl(m.avatarUrl, 256) ?? ''}
                          srcSet={avatarSrcSet(m.avatarUrl)}
                          sizes="104px"
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        initials(m.name)
                      )}
                    </span>
                    <span className={styles.pname}>{m.name}</span>
                    <span className={styles.pfield}>{m.fields[0] ?? ' '}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
      <footer className={styles.footer}>Hisar School · ideaLab</footer>
    </>
  );
}
