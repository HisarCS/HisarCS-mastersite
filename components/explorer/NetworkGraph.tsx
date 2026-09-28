'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { layoutNetwork, type NetNode, type Network } from '@/lib/graph/network';
import { paletteColor } from '@/lib/util/palette';
import styles from './Explorer.module.css';

/** landscape frame on desktop; portrait below 640px so labels stay legible */
const WIDE = { width: 960, height: 560, margin: { x: 80, y: 36 } };
const NARROW = { width: 420, height: 620, margin: { x: 48, y: 30 } };
const MIN_K = 0.5;
const MAX_K = 4;
/** below this many nodes every item is labelled; above, labels appear on
 *  hover or once zoomed in (Obsidian's behaviour) */
const LABEL_ALL_BELOW = 28;

interface View {
  k: number;
  tx: number;
  ty: number;
}
const HOME: View = { k: 1, tx: 0, ty: 0 };

/** zoom by `factor` keeping the point `at` (viewBox units) fixed on screen */
function zoomView(v: View, factor: number, at: { x: number; y: number }): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
  const f = k / v.k;
  return { k, tx: at.x - (at.x - v.tx) * f, ty: at.y - (at.y - v.ty) * f };
}

const radius = (n: NetNode<unknown>) =>
  n.kind === 'hub' ? 7 + 2.4 * Math.sqrt(n.weight) : 5 + Math.sqrt(n.weight);

/**
 * The directory drawn as a network: items (dark dots) linked to the hub of
 * every facet value they carry (colored, labelled). Hover a node to light up
 * its neighbours; click an item to open it, a hub to filter by it. Drag to
 * pan, wheel or the buttons to zoom.
 */
export function NetworkGraph<T>({
  network,
  selectedHubs,
  onItem,
  onHub,
  label,
}: {
  network: Network<T>;
  /** hub ids ("facet:value") currently used as filters — drawn with a ring */
  selectedHubs: Set<string>;
  onItem: (item: T) => void;
  onHub: (facet: string, value: string) => void;
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setNarrow((e?.contentRect.width ?? 1000) < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const frame = narrow ? NARROW : WIDE;
  const W = frame.width;
  const H = frame.height;
  const pos = useMemo(
    () => layoutNetwork(network, frame, { margin: frame.margin }),
    [network, frame],
  );
  const neighbours = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of network.links) {
      if (!m.has(l.source)) m.set(l.source, new Set());
      if (!m.has(l.target)) m.set(l.target, new Set());
      m.get(l.source)!.add(l.target);
      m.get(l.target)!.add(l.source);
    }
    return m;
  }, [network]);

  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<View>(HOME);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);

  // a new network (new filter / grouping / frame) starts from the home view
  useEffect(() => setView(HOME), [network, frame]);

  /** client px → viewBox units */
  const toBox = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  };

  const zoomAt = (factor: number) => setView((v) => zoomView(v, factor, { x: W / 2, y: H / 2 }));

  // wheel zoom needs a non-passive listener to stop the page scrolling
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const at = {
        x: ((e.clientX - r.left) / r.width) * W,
        y: ((e.clientY - r.top) / r.height) * H,
      };
      setView((v) => zoomView(v, Math.exp(-e.deltaY * 0.0015), at));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [W, H]);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const p = toBox(e.clientX, e.clientY);
    drag.current = { x: p.x, y: p.y, view, moved: false };
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toBox(e.clientX, e.clientY);
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) svgRef.current?.setPointerCapture(e.pointerId);
    d.moved = true;
    setView({ ...d.view, tx: d.view.tx + dx, ty: d.view.ty + dy });
  };
  const endDrag = () => {
    // keep `moved` readable by the click that follows this pointerup
    setTimeout(() => (drag.current = null), 0);
  };
  const wasDrag = () => drag.current?.moved === true;

  const activate = (n: NetNode<T>) => {
    if (n.kind === 'item' && n.item !== undefined) onItem(n.item);
    else if (n.facet && n.value !== undefined) onHub(n.facet, n.value);
  };

  const lit = hover ? new Set([hover, ...(neighbours.get(hover) ?? [])]) : null;
  const itemCount = network.nodes.filter((n) => n.kind === 'item').length;
  const showItemLabel = (id: string) =>
    itemCount < LABEL_ALL_BELOW || view.k >= 1.6 || (lit?.has(id) ?? false);

  return (
    <div className={styles.graphWrap} ref={wrapRef}>
      <svg
        ref={svgRef}
        className={styles.graph}
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          {network.links.map((l) => {
            const a = pos.get(l.source)!;
            const b = pos.get(l.target)!;
            const on = lit ? lit.has(l.source) && lit.has(l.target) : false;
            return (
              <line
                key={`${l.source}>${l.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`${styles.link} ${on ? styles.linkOn : ''} ${lit && !on ? styles.dim : ''}`}
                strokeWidth={1 / view.k}
              />
            );
          })}
          {network.nodes.map((n) => {
            const p = pos.get(n.id)!;
            const r = radius(n) / Math.sqrt(view.k);
            const hub = n.kind === 'hub';
            const dim = lit && !lit.has(n.id);
            const showLabel = hub || showItemLabel(n.id);
            return (
              <g
                key={n.id}
                transform={`translate(${p.x} ${p.y})`}
                className={`${styles.node} ${dim ? styles.dim : ''}`}
                role={hub ? 'button' : 'link'}
                aria-label={hub ? `Filter by ${n.label}` : `Open ${n.label}`}
                aria-pressed={hub ? selectedHubs.has(n.id) : undefined}
                tabIndex={0}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover(null)}
                onClick={() => !wasDrag() && activate(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate(n);
                  }
                }}
              >
                {/* invisible, finger-sized hit area — the dot alone is too small to tap */}
                <circle r={Math.max(r + 8, 14 / view.k)} className={styles.hit} />
                {hub && selectedHubs.has(n.id) && (
                  <circle r={r + 4 / Math.sqrt(view.k)} className={styles.ring} />
                )}
                <circle
                  r={r}
                  className={hub ? styles.hub : styles.item}
                  style={hub ? { fill: paletteColor(n.label) } : undefined}
                />
                {showLabel && (
                  <text
                    y={-r - 5 / view.k}
                    textAnchor="middle"
                    className={hub ? styles.hubLabel : styles.itemLabel}
                    fontSize={(hub ? 13 : 11.5) / Math.sqrt(view.k)}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className={styles.zoom}>
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.3)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.3)}>
          −
        </button>
        <button type="button" aria-label="Reset view" onClick={() => setView(HOME)}>
          ⟲
        </button>
      </div>
    </div>
  );
}
