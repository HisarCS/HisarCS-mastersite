'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listPublishQueue,
  publishPerson,
  publishResearch,
  type QueuedPerson,
  type QueuedResearch,
} from '@/lib/data/admin';
import styles from './Admin.module.css';

/** Drafts waiting to go public: profiles and research entries. */
export function PublishQueue() {
  const [queue, setQueue] = useState<{
    people: QueuedPerson[];
    research: QueuedResearch[];
  } | null>();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => setQueue(await listPublishQueue()), []);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (run: () => Promise<string | null>) => {
    setError(await run());
    await load();
  };

  if (queue === undefined) return <p className={styles.muted}>Loading…</p>;
  if (queue === null) return <p className={styles.error}>Couldn&apos;t load the queue.</p>;

  return (
    <div className={styles.stack}>
      {error && <p className={styles.error}>{error}</p>}
      <h2 className={styles.h2}>Profiles ({queue.people.length})</h2>
      {queue.people.length === 0 && <p className={styles.muted}>No unpublished profiles.</p>}
      <ul className={styles.list}>
        {queue.people.map((p) => (
          <li key={p.id} className={styles.row}>
            <Link href={`/person?id=${encodeURIComponent(p.publicId)}`}>{p.name}</Link>
            <span className={styles.muted}>
              {p.gradYear ? `Class of ${p.gradYear}` : 'no graduation year yet'}
            </span>
            <button
              type="button"
              className={styles.primary}
              disabled={!p.gradYear}
              title={p.gradYear ? undefined : 'A profile needs a graduation year to be published'}
              aria-label={`Publish ${p.name}`}
              onClick={() => void act(() => publishPerson(p.id))}
            >
              Publish
            </button>
          </li>
        ))}
      </ul>

      <h2 className={styles.h2}>Research drafts ({queue.research.length})</h2>
      {queue.research.length === 0 && <p className={styles.muted}>No research drafts.</p>}
      <ul className={styles.list}>
        {queue.research.map((r) => (
          <li key={r.id} className={styles.row}>
            <Link href={`/research?id=${encodeURIComponent(r.publicId)}`}>{r.title}</Link>
            <span />
            <button
              type="button"
              className={styles.primary}
              aria-label={`Publish ${r.title}`}
              onClick={() => void act(() => publishResearch(r.id))}
            >
              Publish
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
