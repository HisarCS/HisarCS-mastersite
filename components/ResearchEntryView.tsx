'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getResearchEntry, researchFileUrl } from '@/lib/data/researchEntries';
import { getAuthUser, getMyProfile } from '@/lib/data/auth';
import { mockResearchEntry } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { safeUrl } from '@/lib/util/html';
import type { ResearchEntry } from '@/lib/domain/types';
import { MarkdownPage } from './markdown/MarkdownPage';
import { SiteHeader } from './SiteHeader';
import { Unavailable } from './Unavailable';
import styles from './ResearchEntryView.module.css';

const COLORS = ['#e8542f', '#2f6fe8', '#28a06d', '#c4a11f', '#9048c8', '#d2447e'];

const initials = (s: string) =>
  (s || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const colorFor = (s: string) =>
  COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]!;

type State = { status: 'loading' } | { status: 'ok'; entry: ResearchEntry } | { status: 'missing' };

/** Member-created research entry page (DB-backed). When `embedded` (homepage
 *  detail modal) the shared header is omitted. Curated research is rendered by
 *  ResearchView; this handles the member/DB entries. */
export function ResearchEntryView({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const entry = await getResearchEntry(id);
      if (!alive) return;
      if (entry) {
        setState({ status: 'ok', entry });
        // offer the editor to this entry's own members
        const user = await getAuthUser();
        const me = user ? await getMyProfile(user.userId) : null;
        if (!alive) return;
        setCanEdit(!!me && entry.members.some((m) => m.publicId === me.publicId));
      } else if (currentEnv() === 'local') {
        setState({ status: 'ok', entry: mockResearchEntry(id) });
      } else {
        setState({ status: 'missing' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (state.status === 'ok') document.title = `${state.entry.title} — ideaLab`;
  }, [state]);

  if (state.status === 'loading') {
    return (
      <>
        {!embedded && <SiteHeader />}
        <main className={styles.main} aria-busy="true">
          <div className={styles.loading}>
            <span className={styles.spinner} aria-hidden="true" />
          </div>
        </main>
      </>
    );
  }

  if (state.status === 'missing') {
    return (
      <Unavailable
        heading="This research isn’t available"
        detail="It may be a draft, may have been removed, or the link may be mistyped."
      />
    );
  }

  const p = state.entry;

  return (
    <>
      {!embedded && <SiteHeader />}
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.pav}>
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatarUrl} alt="" className={styles.pavImg} />
            ) : (
              initials(p.title)
            )}
          </div>
          <div>
            <h1 className={styles.title}>
              {p.title}{' '}
              <span className={`${styles.badge} ${p.published ? styles.live : styles.draft}`}>
                {p.published ? 'Published' : 'Draft'}
              </span>
              {/* shown only to this entry's own members; RLS is what actually
                  gates the edit, this is the affordance */}
              {canEdit && (
                <Link
                  className={styles.editBtn}
                  href={`/research/edit?id=${encodeURIComponent(p.publicId)}`}
                >
                  Edit
                </Link>
              )}
            </h1>
            {p.fields.length > 0 && (
              <div className={styles.chips}>
                {p.fields.map((f) => (
                  <span key={f} className={styles.chip}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {(p.members.length > 0 || p.externalAuthors.length > 0) && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Members</h2>
            <div className={styles.members}>
              {/* collaborators without an account here are credited the same
                  way, just not linked — there's no profile to open */}
              {p.externalAuthors.map((a, i) => (
                <span key={`${a.name}-${i}`} className={styles.member}>
                  <span className={styles.ma} style={{ background: colorFor(a.name) }}>
                    {initials(a.name)}
                  </span>
                  <span>
                    <span className={styles.mn}>{a.name}</span>
                    <br />
                    <span className={styles.mr}>{a.role || 'Member'}</span>
                  </span>
                </span>
              ))}
              {p.members.map((m) => (
                <Link
                  key={m.publicId}
                  className={styles.member}
                  href={`/person?id=${encodeURIComponent(m.publicId)}`}
                >
                  <span className={styles.ma} style={{ background: m.color || colorFor(m.name) }}>
                    {initials(m.name)}
                  </span>
                  <span>
                    <span className={styles.mn}>{m.name}</span>
                    <br />
                    <span className={styles.mr}>{m.role}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {p.page ? (
          // composed markdown page — same renderer the editor preview uses
          <MarkdownPage markdown={p.page.markdown} />
        ) : (
          <>
            <section className={styles.section}>
              <h2 className={styles.h2}>About</h2>
              <div className={styles.desc}>{p.description}</div>
            </section>

            {p.files.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.h2}>Files</h2>
                <div className={styles.files}>
                  {p.files.map((f) => {
                    const label = f.caption || String(f.storagePath).split('/').pop() || 'file';
                    const url = researchFileUrl(f.storagePath);
                    return (
                      <a
                        key={f.id}
                        className={styles.file}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {f.kind === 'image' ? (
                          <div className={styles.thumb}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className={styles.thumbImg}
                            />
                          </div>
                        ) : (
                          <div className={styles.thumb} style={{ background: colorFor(label) }}>
                            {f.kind === 'pdf' ? 'PDF' : '📄'}
                          </div>
                        )}
                        <div className={styles.cap}>{label}</div>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {p.links.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.h2}>Links</h2>
                <div className={styles.links}>
                  {p.links.map((l) => (
                    <a
                      key={`${l.label}-${l.url}`}
                      className={styles.link}
                      href={safeUrl(l.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={styles.arrow}>↗</span>
                      <span>
                        <span className={styles.ll}>{l.label}</span>
                        <br />
                        <span className={styles.lu}>
                          {String(l.url).replace(/^https?:\/\//, '')}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
