'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { getAuthUser } from '@/lib/data/auth';
import { isAdmin } from '@/lib/data/admin';
import { AdminList } from './admin/AdminList';
import { InterestAreasEditor } from './admin/InterestAreasEditor';
import { PublishQueue } from './admin/PublishQueue';
import { SiteHeader } from './SiteHeader';
import { Unavailable } from './Unavailable';
import styles from './admin/Admin.module.css';

/** The admin tabs — one entry per tab; add a tab by adding an entry. Each
 *  panel gets the signed-in admin's GitHub login. */
const TABS: Record<
  'queue' | 'admins' | 'areas',
  { label: string; Panel: ComponentType<{ me: string }> }
> = {
  queue: { label: 'Publish queue', Panel: PublishQueue },
  admins: { label: 'Admins', Panel: AdminList },
  areas: { label: 'Interest areas', Panel: InterestAreasEditor },
};
type Tab = keyof typeof TABS;

type Gate =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'denied' }
  | { status: 'ok'; me: string };

/** /admin — publish queue, admin allowlist, interest areas. Admins only. */
export function AdminArea() {
  const [gate, setGate] = useState<Gate>({ status: 'loading' });
  const [tab, setTab] = useState<Tab>('queue');

  useEffect(() => {
    document.title = 'Admin — ideaLab';
    void (async () => {
      const user = await getAuthUser();
      if (!user) return setGate({ status: 'signed-out' });
      setGate((await isAdmin()) ? { status: 'ok', me: user.githubLogin } : { status: 'denied' });
    })();
  }, []);

  if (gate.status === 'loading')
    return (
      <>
        <SiteHeader />
        <main className={styles.main} aria-busy="true" />
      </>
    );
  if (gate.status === 'signed-out')
    return (
      <>
        <SiteHeader />
        <main className={styles.main}>
          <h1 className={styles.title}>Admin</h1>
          <p className={styles.sub}>
            <Link href="/member">Sign in</Link> with an admin&apos;s GitHub account.
          </p>
        </main>
      </>
    );
  if (gate.status === 'denied')
    return (
      <Unavailable
        heading="Admins only"
        detail="Your account isn't on the admin list. Ask an existing admin to add you."
      />
    );

  const { Panel } = TABS[tab];
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.eyebrow}>Lab operations</div>
        <h1 className={styles.title}>Admin</h1>
        <div className={styles.tabs} role="tablist" aria-label="Admin sections">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? styles.tabOn : ''}
              onClick={() => setTab(t)}
            >
              {TABS[t].label}
            </button>
          ))}
        </div>
        <section role="tabpanel" aria-label={TABS[tab].label}>
          <Panel me={gate.me} />
        </section>
      </main>
    </>
  );
}
