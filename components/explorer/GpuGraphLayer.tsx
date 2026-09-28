'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import type { NetNode, Network, Point } from '@/lib/graph/network';
import {
  cameraFor,
  frameToWorld,
  parseColor,
  pxToWorld,
  type Frame,
  type View,
} from '@/lib/graph/gpuSpace';
import type { GraphTheme } from './graphThemes';
import styles from './Explorer.module.css';

type Animoo = typeof import('@outercloud/animoo');
type Vec4 = InstanceType<Animoo['Vector4']>;

/** Everything the GPU layer draws — read live every frame through a ref. */
export interface GpuScene<T> {
  network: Network<T>;
  pos: Map<string, Point>;
  frame: Frame;
  view: View;
  /** hovered node + neighbours, or null (a new Set only when hover changes) */
  lit: Set<string> | null;
  theme: GraphTheme;
  radius: (n: NetNode<T>) => number;
}

/** 60 animoo ticks per second */
const s = (seconds: number) => Math.round(seconds * 60);

/**
 * Draws the graph's links and dots with animoo on WebGPU: links draw out from
 * their items, dots pop in (easeOutBack), and hover lights a neighbourhood
 * with short color tweens. Labels, hit areas, and focus rings stay in the
 * SVG above, so interaction and accessibility are unchanged. Reports
 * 'svg' when WebGPU is missing or fails, and the SVG draws everything.
 */
export function GpuGraphLayer<T>({
  scene,
  onStatus,
}: {
  scene: GpuScene<T>;
  onStatus: (renderer: 'webgpu' | 'svg') => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(scene);
  const statusRef = useRef(onStatus);
  const engine = useRef<{ animoo: Animoo; player: StoppablePlayerLike } | null>(null);

  useEffect(() => {
    sceneRef.current = scene;
    statusRef.current = onStatus;
  });

  // boot once: load animoo on demand, fall back to SVG on any failure
  useEffect(() => {
    let cancelled = false;
    let player: StoppablePlayerLike | null = null;
    const canvas = canvasRef.current;
    const ro = canvas ? new ResizeObserver(() => sizeCanvas(canvas)) : null;
    void (async () => {
      if (!canvas || !('gpu' in navigator)) return statusRef.current('svg');
      try {
        const animoo = await import('@outercloud/animoo');
        if (cancelled) return;
        sizeCanvas(canvas);
        ro?.observe(canvas);
        const Stoppable = stoppablePlayer(animoo, () => statusRef.current('svg'));
        player = new Stoppable(canvas, director(animoo, sceneRef));
        await player.setup();
        if (cancelled) return player.stop();
        engine.current = { animoo, player };
        player.play();
        statusRef.current('webgpu');
      } catch {
        if (!cancelled) statusRef.current('svg');
      }
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
      player?.stop();
      engine.current = null;
    };
  }, []);

  // a new network, frame, or theme rebuilds the scene (and replays the build-in)
  useEffect(() => {
    const e = engine.current;
    if (e) e.player.restart(director(e.animoo, sceneRef));
  }, [scene.network, scene.frame, scene.theme]);

  return <canvas ref={canvasRef} className={styles.gpuCanvas} aria-hidden="true" />;
}

/** Backing store at device-pixel resolution, so dots and lines stay crisp. */
function sizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
}

interface StoppablePlayerLike {
  setup(): Promise<void>;
  play(): void;
  stop(): void;
  restart(generator: unknown): void;
}

/**
 * animoo's Player, made safe to mount and unmount in a React page:
 * - stop(): its requestAnimationFrame loop otherwise runs forever;
 * - restart(): setContext() resets the tick counter but not the clock, so
 *   every tween after a rebuild would finish on the next frame — reset both;
 * - a render error (e.g. a lost GPU device) stops the loop and falls back to
 *   SVG instead of freezing the last frame.
 */
function stoppablePlayer(animoo: Animoo, onFail: () => void) {
  return class extends animoo.Player implements StoppablePlayerLike {
    private stopped = false;
    stop() {
      this.stopped = true;
    }
    restart(generator: unknown) {
      this.setContext(generator);
      (this as unknown as { start: number }).start = Date.now();
    }
    update() {
      if (!this.stopped) super.update();
    }
    render() {
      try {
        super.render();
      } catch {
        this.stopped = true;
        onFail();
      }
    }
  };
}

/** Wait `frames` ticks, then run `g` — for staggering the build-in. */
function* after(frames: number, g: Generator): Generator {
  for (let i = 0; i < frames; i++) yield null;
  yield* g;
}

/**
 * The animoo clip: builds the scene, animates it in, then runs forever —
 * syncing the camera to the SVG's pan/zoom and tweening colors on hover.
 * (In animoo, yielding a generator runs it alongside; yielding null waits a
 * tick.)
 */
function director<T>(a: Animoo, sceneRef: MutableRefObject<GpuScene<T>>) {
  return function* ({
    add,
    background,
    camera,
  }: {
    add: <E>(e: E) => E;
    background: (c: Vec4) => void;
    camera: { position: { value: unknown }; scale: { value: number } };
  }): Generator {
    const snap = sceneRef.current;
    const { frame, theme, network, pos } = snap;
    const vec4 = (css: string) => {
      const c = parseColor(css);
      return new a.Vector4(c.r, c.g, c.b, c.a);
    };
    const fade = (c: Vec4, f: number) => new a.Vector4(c.x, c.y, c.z, c.w * f);
    const C = {
      link: vec4(theme.colors.link),
      on: vec4(theme.colors.linkOn),
      item: vec4(theme.colors.item),
      hub: vec4(theme.colors.hub),
    };
    const world = (id: string) => {
      const q = frameToWorld(pos.get(id)!, frame);
      return new a.Vector2(q.x, q.y);
    };
    const k = () => sceneRef.current.view.k;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    background(vec4(theme.colors.background));

    const lines = network.links.map((l) => {
      const from = world(l.source);
      const to = world(l.target);
      const el = add(
        new a.Line({
          start: from,
          end: still ? to : from,
          // ~1.2 screen px at any zoom (the camera scales everything by k)
          size: () => {
            const w = pxToWorld(1.2 / k(), frame);
            return (w.x + w.y) / 2;
          },
          color: C.link,
          order: 0,
        }),
      );
      return { l, el, to };
    });

    const nodes = network.nodes.map((n) => {
      const grow = a.react(still ? 1 : 0);
      const base = n.kind === 'hub' ? C.hub : C.item;
      const el = add(
        new a.Ellipse({
          position: world(n.id),
          size: () => {
            const d = pxToWorld((2 * snap.radius(n)) / Math.sqrt(k()), frame);
            return new a.Vector2(d.x * grow.value, d.y * grow.value);
          },
          color: base,
          order: n.kind === 'hub' ? 2 : 1,
        }),
      );
      return { n, el, grow, base };
    });

    // build-in: links draw out over ~0.6s, then dots pop, hubs first
    if (!still) {
      const spread = s(0.6);
      for (const [i, ln] of lines.entries())
        yield after(
          Math.round((i / Math.max(lines.length, 1)) * spread),
          ln.el.end.to(ln.to, 0.5, a.easeOut),
        );
      const ordered = [...nodes].sort(
        (x, y) => (x.n.kind === 'hub' ? -1 : 0) - (y.n.kind === 'hub' ? -1 : 0),
      );
      for (const [i, nd] of ordered.entries())
        yield after(
          s(0.25) + Math.round((i / Math.max(ordered.length, 1)) * spread),
          nd.grow.to(1, 0.45, a.easeOutBack),
        );
    }

    // hover: short color tweens; a newer tween on the same element wins
    const latest = new Map<object, number>();
    let ticket = 0;
    function* tweenColor(el: { color: { value: Vec4 } }, to: Vec4): Generator {
      const mine = ++ticket;
      latest.set(el, mine);
      const from = el.color.value;
      const frames = still ? 1 : s(0.15);
      for (let f = 1; f <= frames; f++) {
        if (latest.get(el) !== mine) return;
        el.color.value = a.lerp(from, to, a.easeOut(f / frames));
        yield null;
      }
    }

    let shownLit: Set<string> | null | undefined;
    for (;;) {
      const cur = sceneRef.current;
      const cam = cameraFor(cur.view, frame);
      camera.position.value = new a.Vector2(cam.x, cam.y);
      camera.scale.value = cam.scale;

      if (cur.lit !== shownLit) {
        shownLit = cur.lit;
        const lit = cur.lit;
        for (const nd of nodes)
          yield tweenColor(nd.el, !lit ? nd.base : lit.has(nd.n.id) ? C.on : fade(nd.base, 0.18));
        for (const ln of lines) {
          const on = lit?.has(ln.l.source) && lit.has(ln.l.target);
          yield tweenColor(ln.el, !lit ? C.link : on ? C.on : fade(C.link, 0.35));
        }
      }
      yield null;
    }
  };
}
