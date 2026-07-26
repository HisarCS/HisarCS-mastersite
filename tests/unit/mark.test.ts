import { describe, it, expect } from 'vitest';
import { buildGrid, seededCellOrder, PIXEL_MAP } from '../../lib/homepage/mark';

describe('buildGrid', () => {
  it('parses one cell per "#" in the map', () => {
    const hashes = PIXEL_MAP.join('')
      .split('')
      .filter((c) => c === '#').length;
    const grid = buildGrid();
    expect(grid.cells.length).toBe(hashes);
    expect(grid.rows).toBe(PIXEL_MAP.length);
    expect(grid.cols).toBe(Math.max(...PIXEL_MAP.map((l) => l.length)));
  });

  it('reads a tiny custom map correctly', () => {
    const grid = buildGrid(['#.', '.#']);
    expect(grid.cells).toEqual([
      { c: 0, r: 0 },
      { c: 1, r: 1 },
    ]);
  });
});

describe('seededCellOrder', () => {
  it('is a stable permutation for a given seed', () => {
    const a = seededCellOrder(10, 1337);
    const b = seededCellOrder(10, 1337);
    expect(a).toEqual(b); // deterministic
    expect([...a].sort((x, y) => x - y)).toEqual([...Array(10).keys()]); // permutation of 0..9
  });

  it('differs across seeds', () => {
    expect(seededCellOrder(10, 1)).not.toEqual(seededCellOrder(10, 2));
  });
});
