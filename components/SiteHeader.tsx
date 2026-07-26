import Link from 'next/link';
import styles from './SiteHeader.module.css';

/**
 * Site-wide header. Research and One of Us sit next to the ideaLab wordmark
 * (grouped left), no arrows. The homepage adds the Members/Research mode toggles
 * on top of this.
 */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          idea<span>Lab</span>
        </Link>
        <Link href="/research" className={styles.link}>
          Research
        </Link>
        <Link href="/member" className={styles.link}>
          One of Us
        </Link>
      </nav>
    </header>
  );
}
