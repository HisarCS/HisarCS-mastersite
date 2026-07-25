import Link from 'next/link';
import styles from './Unavailable.module.css';

/**
 * Honest "nothing to show / can't reach backend" state (ADR-0009). The mark is
 * the downturned ".(" — the same one the original site used for error pages.
 */
export function Unavailable({ heading, detail }: { heading: string; detail: string }) {
  return (
    <main className={styles.wrap}>
      <div aria-hidden className={styles.mark}>
        .<span>(</span>
      </div>
      <div className={styles.heading}>{heading}</div>
      <div className={styles.detail}>{detail}</div>
      <Link href="/" className={styles.back}>
        back to the mark
      </Link>
    </main>
  );
}
