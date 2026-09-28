'use client';

import { useCallback, useEffect, useState } from 'react';
import { addAdmin, listAdmins, removeAdmin } from '@/lib/data/admin';
import { adminRemovalBlocker, normalizeGithubLogin } from '@/lib/domain/admin';
import styles from './Admin.module.css';

/** The admin allowlist (GitHub usernames). */
export function AdminList({ me }: { me: string }) {
  const [admins, setAdmins] = useState<string[] | null>();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => setAdmins(await listAdmins()), []);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const r = normalizeGithubLogin(draft);
    if (r.error !== undefined) return setError(r.error);
    const err = await addAdmin(r.ok);
    setError(err);
    if (!err) setDraft('');
    await load();
  };

  if (admins === undefined) return <p className={styles.muted}>Loading…</p>;
  if (admins === null) return <p className={styles.error}>Couldn&apos;t load the admins.</p>;

  return (
    <div className={styles.stack}>
      <p className={styles.muted}>
        Admins sign in with GitHub like everyone else; being on this list is what lets them publish
        anyone and edit these settings.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <ul className={styles.list}>
        {admins.map((a) => {
          const blocked = adminRemovalBlocker(a, me, admins);
          return (
            <li key={a} className={styles.row}>
              <a href={`https://github.com/${a}`} target="_blank" rel="noopener noreferrer">
                @{a}
              </a>
              <span className={styles.muted}>{a === me.toLowerCase() ? 'you' : ''}</span>
              <button
                type="button"
                className={styles.ghost}
                disabled={!!blocked}
                title={blocked ?? undefined}
                aria-label={`Remove @${a}`}
                onClick={async () => {
                  setError(await removeAdmin(a));
                  await load();
                }}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      <form
        className={styles.inline}
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="github-username"
          aria-label="GitHub username to make an admin"
        />
        <button type="submit" className={styles.primary}>
          Add admin
        </button>
      </form>
    </div>
  );
}
