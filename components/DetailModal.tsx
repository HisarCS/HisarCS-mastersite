'use client';

import { PersonView } from './PersonView';
import { ProjectView } from './ProjectView';
import { ResearchView } from './ResearchView';
import type { CarouselItem } from './Carousel';
import styles from './DetailModal.module.css';

/**
 * Inline detail over the dimmed carousel — the selected card's full profile
 * (reusing PersonView/ProjectView, header omitted), with prev/next through the
 * carousel and back-to-carousel. Keyboard (Esc / ← / →) is handled in Home so
 * it composes with the mode state.
 */
export function DetailModal({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: CarouselItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];
  if (!item) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button
        className={styles.nav}
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        disabled={index === 0}
        aria-label="Previous"
      >
        ‹
      </button>

      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className={styles.close} onClick={onClose} aria-label="Back to carousel">
          ×
        </button>
        <div className={styles.body}>
          {item.kind === 'member' ? (
            <PersonView id={item.detailId} embedded />
          ) : item.kind === 'research' ? (
            <ResearchView id={item.detailId} embedded />
          ) : (
            <ProjectView id={item.detailId} embedded />
          )}
        </div>
      </div>

      <button
        className={styles.nav}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        disabled={index === items.length - 1}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );
}
