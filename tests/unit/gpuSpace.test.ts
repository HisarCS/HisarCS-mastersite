import { describe, it, expect } from 'vitest';
import { cameraFor, frameToWorld, pxToWorld, type View } from '../../lib/graph/gpuSpace';

/**
 * animoo's vertex shaders place a point at
 *   clip = (world − camera.position) / (960, 600) × camera.scale
 * (the scale arrives through w = 1/scale). This replicates that, so the tests
 * check our mapping against what the GPU will actually draw.
 */
function shaderClip(world: { x: number; y: number }, cam: { x: number; y: number; scale: number }) {
  return {
    x: ((world.x - cam.x) / 960) * cam.scale,
    y: ((world.y - cam.y) / 600) * cam.scale,
  };
}

/** Where the SVG draws a frame point under the same view, in clip space. */
function svgClip(
  p: { x: number; y: number },
  view: View,
  frame: { width: number; height: number },
) {
  const sx = view.k * p.x + view.tx;
  const sy = view.k * p.y + view.ty;
  return { x: (sx / frame.width) * 2 - 1, y: 1 - (sy / frame.height) * 2 };
}

const FRAMES = [
  { width: 960, height: 560 },
  { width: 420, height: 620 },
];
const VIEWS: View[] = [
  { k: 1, tx: 0, ty: 0 },
  { k: 2.5, tx: -300, ty: 120 },
  { k: 0.6, tx: 80, ty: -40 },
];
const POINTS = [
  { x: 0, y: 0 },
  { x: 123, y: 456 },
  { x: 400, y: 30 },
];

describe('frameToWorld + cameraFor', () => {
  for (const frame of FRAMES)
    for (const view of VIEWS)
      it(`GPU and SVG agree on every point (${frame.width}×${frame.height}, k=${view.k})`, () => {
        const cam = cameraFor(view, frame);
        for (const p of POINTS) {
          const gpu = shaderClip(frameToWorld(p, frame), cam);
          const svg = svgClip(p, view, frame);
          expect(gpu.x).toBeCloseTo(svg.x, 9);
          expect(gpu.y).toBeCloseTo(svg.y, 9);
        }
      });

  it('the frame centre is the world origin, y pointing up', () => {
    const f = { width: 960, height: 560 };
    expect(frameToWorld({ x: 480, y: 280 }, f)).toEqual({ x: 0, y: 0 });
    expect(frameToWorld({ x: 480, y: 0 }, f).y).toBeGreaterThan(0);
  });

  it('the home view needs no camera move', () => {
    expect(cameraFor({ k: 1, tx: 0, ty: 0 }, { width: 960, height: 560 })).toEqual({
      x: 0,
      y: 0,
      scale: 1,
    });
  });
});

describe('pxToWorld', () => {
  it('keeps circles round on any frame aspect', () => {
    for (const frame of FRAMES) {
      const s = pxToWorld(10, frame);
      // 10 frame units on each axis, as the GPU would stretch them to the canvas
      const onScreenX = (s.x / 1920) * frame.width;
      const onScreenY = (s.y / 1200) * frame.height;
      expect(onScreenX).toBeCloseTo(10, 9);
      expect(onScreenY).toBeCloseTo(10, 9);
    }
  });
});
