'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { isAdmin } from '@/lib/data/admin';
import { getAuthUser, onAuthChange, signOutLocal } from '@/lib/data/auth';
import styles from './SiteHeader.module.css';

/**
 * Site-wide header. Members / Research / About Us sit next to the ideaLab wordmark, and the
 * last slot reflects auth state: "One of Us" when signed out, or the member's
 * GitHub handle (linking to their editable member page) plus Sign out when
 * signed in — and an Admin link for admins. Every view renders this, so the
 * signed-in treatment is consistent.
 */
export function SiteHeader() {
  const [ghLogin, setGhLogin] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);

  const resolve = useCallback(async () => {
    const user = await getAuthUser();
    setGhLogin(user ? user.githubLogin || 'you' : null);
    // only admins see the link; the database gates everything behind it
    setAdmin(user ? await isAdmin() : false);
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
        <Link href="/about" className={styles.link}>
          About Us
        </Link>
        {ghLogin ? (
          <span className={styles.session}>
            {admin && (
              <Link href="/admin" className={styles.link}>
                Admin
              </Link>
            )}
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
