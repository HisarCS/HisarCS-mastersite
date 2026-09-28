'use client';

import { useState } from 'react';
import type { CompareSpec } from '@/lib/util/fenceSpecs';
import { researchImgSrcSet } from '@/lib/util/media';
import { mediaUrl } from './media';
import styles from './Markdown.module.css';

/** Before/after: the "after" image underneath, the "before" image clipped to
 *  the slider's position on top. The range input is the control, so it works
 *  with a mouse, a finger, and the arrow keys. */
export function CompareSlider({ spec }: { spec: CompareSpec }) {
  const [pos, setPos] = useState(50);
  const img = (src: string, alt: string, className: string, style?: object) => {
    const url = mediaUrl(src);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        style={style}
        src={url}
        srcSet={researchImgSrcSet(url)}
        sizes="(max-width: 900px) 100vw, 840px"
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    );
  };
  return (
    <figure className={`${styles.figure} ${styles.full}`}>
      <div className={styles.compare}>
        {img(spec.after.src, spec.after.caption, styles.compareImg)}
        {img(spec.before.src, spec.before.caption, `${styles.compareImg} ${styles.compareTop}`, {
          clipPath: `inset(0 ${100 - pos}% 0 0)`,
        })}
        <div className={styles.compareLine} style={{ left: `${pos}%` }} aria-hidden="true" />
        <span className={`${styles.compareTag} ${styles.compareBefore}`}>Before</span>
        <span className={`${styles.compareTag} ${styles.compareAfter}`}>After</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className={styles.compareRange}
          aria-label="Before and after — slide to compare"
          aria-valuetext={`${pos}% before`}
        />
      </div>
      <figcaption className={styles.caption}>
        <b>Before:</b> {spec.before.caption} · <b>After:</b> {spec.after.caption}
      </figcaption>
    </figure>
  );
}
