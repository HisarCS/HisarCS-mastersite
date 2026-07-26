'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProject, projectFileUrl } from '@/lib/data/projects';
import { mockProject } from '@/lib/data/mock';
import { currentEnv } from '@/lib/env';
import { safeUrl } from '@/lib/util/html';
import type { Project } from '@/lib/domain/types';
import { SiteHeader } from './SiteHeader';
import { Unavailable } from './Unavailable';
import styles from './ProjectView.module.css';

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

type State = { status: 'loading' } | { status: 'ok'; project: Project } | { status: 'missing' };

/** Public project page — read-only view. When `embedded` (homepage detail modal)
 *  the shared header is omitted. */
export function ProjectView({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const project = await getProject(id);
      if (!alive) return;
      if (project) setState({ status: 'ok', project });
      else if (currentEnv() === 'local') setState({ status: 'ok', project: mockProject(id) });
      else setState({ status: 'missing' });
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (state.status === 'ok') document.title = `${state.project.title} — ideaLab`;
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
        heading="This project isn’t available"
        detail="It may be a draft, may have been removed, or the link may be mistyped."
      />
    );
  }

  const p = state.project;

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

        {p.members.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Members</h2>
            <div className={styles.members}>
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
                const url = projectFileUrl(f.storagePath);
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
                    <span className={styles.lu}>{String(l.url).replace(/^https?:\/\//, '')}</span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
