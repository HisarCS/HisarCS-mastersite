'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMember } from '@/lib/data/members';
import { mockPerson } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { safeUrl } from '@/lib/util/html';
import type { Member } from '@/lib/domain/types';
import { SiteHeader } from './SiteHeader';
import { Unavailable } from './Unavailable';
import styles from './PersonView.module.css';

const FALLBACK_COLORS = ['#e8542f', '#2f6fe8', '#28a06d', '#c4a11f', '#9048c8', '#d2447e'];

type State =
  | { status: 'loading' }
  | { status: 'ok'; member: Member }
  | { status: 'missing'; reachable: boolean };

/** Public profile — client-fetched by public_id so edits stay live. */
export function PersonView({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const member = await getMember(id);
      if (!alive) return;
      if (member) setState({ status: 'ok', member });
      else if (currentEnv() === 'local') setState({ status: 'ok', member: mockPerson(id) });
      else setState({ status: 'missing', reachable: true });
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (state.status === 'ok') document.title = `${state.member.name} — ideaLab`;
  }, [state]);

  if (state.status === 'loading') {
    return (
      <>
        <SiteHeader />
        <main className={styles.main} aria-busy="true" />
      </>
    );
  }

  if (state.status === 'missing') {
    return (
      <Unavailable
        heading="This profile isn’t available"
        detail="It may have been unpublished or removed, or the link may be mistyped."
      />
    );
  }

  const p = state.member;
  const initials = p.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const color = p.avatarColor || FALLBACK_COLORS[p.name.length % FALLBACK_COLORS.length];

  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.avatar} style={{ background: color }}>
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatarUrl} alt="" />
            ) : (
              initials
            )}
          </div>
          <div>
            <h1 className={styles.name}>
              {p.name}
              <span className={`${styles.badge} ${p.cohort === 'alumni' ? styles.alumni : ''}`}>
                {p.cohort === 'alumni' ? 'Alumni' : 'Current student'}
              </span>
            </h1>
            <div className={styles.meta}>Class of {p.gradYear}</div>
          </div>
        </div>

        <div className={styles.chips}>
          {p.fields.map((f) => (
            <span key={f} className={styles.chip}>
              {f}
            </span>
          ))}
        </div>

        <p className={styles.bio}>{p.bio}</p>

        <div className={styles.actions}>
          {p.resumeUrl && (
            <a
              className={styles.btn}
              href={safeUrl(p.resumeUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Resume ↗
            </a>
          )}
          {p.githubUsername && (
            <a
              className={`${styles.btn} ${styles.ghost}`}
              href={`https://github.com/${p.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
          )}
        </div>

        <section>
          <h2 className={styles.h2}>Projects</h2>
          {p.projects.length ? (
            p.projects.map((pr) => (
              <Link
                key={pr.publicId}
                className={styles.proj}
                href={`/project?id=${encodeURIComponent(pr.publicId)}`}
              >
                <div className={styles.pav}>
                  {pr.title
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <div className={styles.pt}>{pr.title}</div>
                  <div className={styles.pm}>ideaLab project</div>
                </div>
              </Link>
            ))
          ) : (
            <div className={styles.empty}>No published projects yet.</div>
          )}
        </section>
      </main>
    </>
  );
}
