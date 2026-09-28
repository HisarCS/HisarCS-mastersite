/**
 * Coordinate mapping between the graph's frame (the SVG viewBox: origin top
 * left, y down, `width × height` units) and animoo's GPU world.
 *
 * animoo's shaders divide world positions by a fixed (960, 600) — the canvas
 * always spans a 1920 × 1200 world, centred, y up — and apply the camera as
 * clip = (world − camera.position) / (960, 600) × camera.scale. So a frame of
 * any aspect maps per axis, and the SVG's pan/zoom becomes a camera move.
 * Pure; the tests check it against a replica of the shader.
 */

const WORLD_W = 1920;
const WORLD_H = 1200;

export interface Frame {
  width: number;
  height: number;
}

/** The graph's pan/zoom: screen = k × frame point + (tx, ty). */
export interface View {
  k: number;
  tx: number;
  ty: number;
}

export function frameToWorld(p: { x: number; y: number }, f: Frame): { x: number; y: number } {
  return {
    x: (p.x - f.width / 2) * (WORLD_W / f.width) || 0,
    y: -(p.y - f.height / 2) * (WORLD_H / f.height) || 0,
  };
}

/** A length in frame units as a world-space size per axis — what keeps a
 *  circle round when the canvas aspect isn't 16:10. */
export function pxToWorld(len: number, f: Frame): { x: number; y: number } {
  return { x: len * (WORLD_W / f.width), y: len * (WORLD_H / f.height) };
}

/** The animoo camera that draws exactly what the SVG shows under `view`. */
export function cameraFor(view: View, f: Frame): { x: number; y: number; scale: number } {
  const { k, tx, ty } = view;
  return {
    x: (-(WORLD_W / 2) * (k + (2 * tx) / f.width - 1)) / k || 0,
    y: ((WORLD_H / 2) * (k - 1 + (2 * ty) / f.height)) / k || 0,
    scale: k,
  };
}

/** "#rrggbb[aa]" or "rgb[a](…)" → 0–1 channels, for GPU colors. Anything else
 *  (named colors, var(…)) throws — theme colors must be concrete. */
export function parseColor(css: string): { r: number; g: number; b: number; a: number } {
  const s = css.trim();
  const hex = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return {
      r: ((n >> 16) & 255) / 255,
      g: ((n >> 8) & 255) / 255,
      b: (n & 255) / 255,
      a: hex[2] ? parseInt(hex[2], 16) / 255 : 1,
    };
  }
  const fn = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  );
  if (fn)
    return {
      r: Number(fn[1]) / 255,
      g: Number(fn[2]) / 255,
      b: Number(fn[3]) / 255,
      a: fn[4] === undefined ? 1 : Number(fn[4]),
    };
  throw new Error(`not a concrete color: "${css}"`);
}
