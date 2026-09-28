'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listMembers } from '@/lib/data/members';
import { mockMembers } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { avatarSrcSet, thumbUrl } from '@/lib/util/media';
import { initials, paletteColor as colorFor } from '@/lib/util/palette';
import type { MemberCard } from '@/lib/domain/types';
import { MEMBER_FACETS, memberText } from '@/lib/domain/directoryFacets';
import { Explorer } from './explorer/Explorer';
import { SiteHeader } from './SiteHeader';
import styles from './CardGrid.module.css';

const memberId = (m: MemberCard) => m.id;
const memberName = (m: MemberCard) => m.name;
const byName = (a: MemberCard, b: MemberCard) => a.name.localeCompare(b.name);

/** One row of portraits, alphabetical. */
function PortraitRow({ members }: { members: MemberCard[] }) {
  return (
    <div className={styles.portraitRow}>
      {[...members].sort(byName).map((m) => (
        <Link
          key={m.id}
          href={`/person?id=${encodeURIComponent(m.publicId)}`}
          className={styles.portrait}
        >
          <span className={styles.photo} style={{ background: m.avatarColor || colorFor(m.id) }}>
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
          <span className={styles.pfield}>{m.fields[0] ?? ' '}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * Members index — a classic yearbook: one row of portraits per graduating
 * class, newest class first, kept deliberately minimal (a hairline rule and a
 * small-caps class label per row). The yearbook is the explorer grouped by
 * class; members can also be searched, filtered, regrouped by interest or
 * cohort, or seen as a network.
 */
export function MembersIndex() {
  const router = useRouter();
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
          The makers of ideaLab, class by class — current students and alumni across a decade of the
          lab.
        </p>

        {members.length === 0 ? (
          <div className={styles.empty}>No members to show yet.</div>
        ) : (
          <Explorer
            items={members}
            facets={MEMBER_FACETS}
            text={memberText}
            itemId={memberId}
            itemLabel={memberName}
            onOpen={(m) => router.push(`/person?id=${encodeURIComponent(m.publicId)}`)}
            noun="members"
            searchHint="name, interest, class…"
            defaultGroup="class"
            renderGrid={(list) => <PortraitRow members={list} />}
          />
        )}
      </main>
      <footer className={styles.footer}>Hisar School · ideaLab</footer>
    </>
  );
}
