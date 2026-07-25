/**
 * Animation capability gate for the homepage carousel (ADR: adaptive — FLIP morph
 * on capable desktops, cross-fade everywhere else, and always cross-fade/none
 * when the user prefers reduced motion).
 *
 * `pickTransition()` is the single switch: flipping ANIMATION_MODE (or the
 * capability result) to reversion is a one-line change, and the carousel only
 * reads the returned string — it never hardcodes the strategy.
 */
export type Transition = 'flip' | 'crossfade';

// Override for testing / global revert: 'adaptive' | 'flip' | 'crossfade'.
const ANIMATION_MODE: 'adaptive' | Transition = 'adaptive';

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Capable = fine pointer + wide viewport + motion allowed. */
function capable(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: fine)').matches &&
    window.innerWidth >= 900 &&
    !prefersReducedMotion()
  );
}

export function pickTransition(): Transition {
  if (ANIMATION_MODE === 'crossfade') return 'crossfade';
  if (ANIMATION_MODE === 'flip') return prefersReducedMotion() ? 'crossfade' : 'flip';
  return capable() ? 'flip' : 'crossfade'; // adaptive
}
