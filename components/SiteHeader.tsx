'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthUser, onAuthChange, signOutLocal } from '@/lib/data/auth';
import styles from './SiteHeader.module.css';

/**
 * Site-wide header. Members / Research sit next to the ideaLab wordmark, and the
 * last slot reflects auth state: "One of Us" when signed out, or the member's
 * GitHub handle (linking to their editable member page) plus Sign out when
 * signed in. Every view renders this, so the signed-in treatment is consistent.
 */
export function SiteHeader() {
  const [ghLogin, setGhLogin] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    const user = await getAuthUser();
    setGhLogin(user ? user.githubLogin || 'you' : null);
  }, []);

  useEffect(() => {
    void resolve();
    return onAuthChange(resolve);
  }, [resolve]);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          idea<span>Lab</span>
        </Link>
        <Link href="/members" className={styles.link}>
          Members
        </Link>
        <Link href="/research" className={styles.link}>
          Research
        </Link>
        {ghLogin ? (
          <span className={styles.session}>
            <Link href="/member" className={styles.handle} title="Edit your member page">
              @{ghLogin}
            </Link>
            <button className={styles.signOut} onClick={() => void signOutLocal().then(resolve)}>
              Sign out
            </button>
          </span>
        ) : (
          <Link href="/member" className={styles.link}>
            One of Us
          </Link>
        )}
      </nav>
    </header>
  );
}
