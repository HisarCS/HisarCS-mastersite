import { mulberry32 } from '../util/hash';

/** Tweakable layout constants (ported from the original homepage CONFIG). */
export const MARK_CONFIG = {
  markHeightFrac: 0.7, // mark height as a fraction of viewport height
  markWidthFrac: 0.85, // max mark width as a fraction of viewport width
  cellGapFrac: 0.1, // gap between pixels, as a fraction of cell size
  maxCellPx: 72,
  seed: 1337, // global seed → the same people land on the same pixels
} as const;

/**
 * The mark — hand-drawn pixel art. '#' = a pixel (person or ink filler),
 * '.' = empty. It reads as ".)" typeset in running text: the parenthesis spans
 * the line and dips below the baseline; the period is the small 3×3 dot.
 */
export const PIXEL_MAP = [
  '.....##....',
  '......##...',
  '.......##..',
  '.......##..',
  '........##.',
  '........##.',
  '.........##',
  '.........##',
  '.........##',
  '.........##',
  '.........##',
  '.........##',
  '........##.',
  '###.....##.',
  '###....##..',
  '###....##..',
  '......##...',
  '.....##....',
] as const;

export interface GridCell {
  c: number;
  r: number;
}
export interface Grid {
  cols: number;
  rows: number;
  cells: GridCell[];
}

/** Parse the ASCII map into filled cells. */
export function buildGrid(map: readonly string[] = PIXEL_MAP): Grid {
  const rows = map.length;
  const cols = Math.max(...map.map((l) => l.length));
  const cells: GridCell[] = [];
  map.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === '#') cells.push({ c, r });
    });
  });
  return { cols, rows, cells };
}

/** Seeded shuffle of cell indices → the order people fill pixels (stable). */
export function seededCellOrder(cellCount: number, seed = MARK_CONFIG.seed): number[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: cellCount }, (_, i) => ({ i, k: rnd() }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.i);
}

export interface MarkLayout {
  cell: number;
  gap: number;
  originX: number;
  originY: number;
}

/** Scale the glyph-space grid to the viewport (resolution-independent). */
export function computeLayout(w: number, h: number, grid: Grid): MarkLayout {
  const cell = Math.min(
    (h * MARK_CONFIG.markHeightFrac) / grid.rows,
    (w * MARK_CONFIG.markWidthFrac) / grid.cols,
    MARK_CONFIG.maxCellPx,
  );
  const gap = cell * MARK_CONFIG.cellGapFrac;
  return {
    cell,
    gap,
    originX: (w - grid.cols * cell) / 2,
    originY: (h - grid.rows * cell) / 2,
  };
}
