import Link from 'next/link';
import styles from './SiteHeader.module.css';

// Research is served as a static file from public/ (colleague's content, kept
// as-is), so it needs the basePath prepended manually — unlike Next <Link>,
// which does that automatically for real routes.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Site-wide header. Per the nav redesign: Research and One of Us sit next to the
 * ideaLab wordmark (grouped left), no arrows. The homepage adds the
 * Members/Projects mode toggles on top of this in Phase 3.
 */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          idea<span>Lab</span>
        </Link>
        <a href={`${BASE}/research.html`} className={styles.link}>
          Research
        </a>
        <Link href="/member" className={styles.link}>
          One of Us
        </Link>
      </nav>
    </header>
  );
}
