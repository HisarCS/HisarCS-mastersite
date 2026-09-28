import type { Facet } from '../domain/facets';
import { hashStr, mulberry32 } from '../util/hash';

/**
 * The directory's network view, Obsidian-graph style: every item is a node,
 * every value of the chosen facet ("Robotics", "IDC", "2025") is a hub node,
 * and an item links to each hub it carries — so items that share an interest
 * or a conference cluster around it. Pure and tested; the component only draws.
 */

export interface NetNode<T> {
  /** "item:<id>" or "<facet key>:<value>" */
  id: string;
  kind: 'item' | 'hub';
  label: string;
  /** links touching this node — sizes the dot */
  weight: number;
  /** items only: the source item */
  item?: T;
  /** hubs only: the facet + value they stand for */
  facet?: string;
  value?: string;
}

export interface NetLink {
  source: string;
  target: string;
}

export interface Network<T> {
  nodes: NetNode<T>[];
  links: NetLink[];
}

export function buildNetwork<T>(
  items: T[],
  facet: Facet<T>,
  key: { id: (item: T) => string; label: (item: T) => string },
): Network<T> {
  const itemNodes: NetNode<T>[] = [];
  const hubs = new Map<string, NetNode<T>>();
  const links: NetLink[] = [];

  for (const it of items) {
    const node: NetNode<T> = {
      id: `item:${key.id(it)}`,
      kind: 'item',
      label: key.label(it),
      weight: 0,
      item: it,
    };
    itemNodes.push(node);
    for (const value of new Set(facet.values(it))) {
      const hubId = `${facet.key}:${value}`;
      let hub = hubs.get(hubId);
      if (!hub) {
        hub = { id: hubId, kind: 'hub', label: value, weight: 0, facet: facet.key, value };
        hubs.set(hubId, hub);
      }
      hub.weight++;
      node.weight++;
      links.push({ source: node.id, target: hubId });
    }
  }

  const hubNodes = [...hubs.values()].sort((a, b) => a.label.localeCompare(b.label));
  return { nodes: [...itemNodes, ...hubNodes], links };
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Force-directed layout (Fruchterman–Reingold plus a pull toward the centre,
 * so disconnected clusters sit side by side instead of flying apart). The
 * simulation runs unbounded, then the result is scaled to fit the frame —
 * never clamped, so nothing piles up on the walls. The pull is elliptical to
 * match the frame's aspect. `margin` leaves room for labels at the sides.
 * Seeded from the node ids, so the same network always lands the same way.
 * O(n²) per step, which is fine at lab scale (a few hundred nodes).
 */
export function layoutNetwork<T>(
  net: Network<T>,
  size: { width: number; height: number },
  { iterations = 300, margin = { x: 80, y: 36 } } = {},
): Map<string, Point> {
  const n = net.nodes.length;
  const out = new Map<string, Point>();
  if (n === 0) return out;
  const cx = size.width / 2;
  const cy = size.height / 2;
  if (n === 1) {
    out.set(net.nodes[0]!.id, { x: cx, y: cy });
    return out;
  }

  const index = new Map(net.nodes.map((node, i) => [node.id, i]));
  const edges = net.links
    .map((l) => [index.get(l.source), index.get(l.target)] as const)
    .filter((e): e is readonly [number, number] => e[0] !== undefined && e[1] !== undefined);

  // abstract units: ideal edge length K; the frame's aspect shapes the pull
  const K = 40;
  const aspect = size.width / size.height;
  const gx = 0.06;
  const gy = gx * aspect;
  const rand = mulberry32(hashStr(net.nodes.map((node) => node.id).join('|')));
  const spread = K * Math.sqrt(n);
  const xs = net.nodes.map(() => (rand() - 0.5) * spread * aspect);
  const ys = net.nodes.map(() => (rand() - 0.5) * spread);
  let temp = spread / 2;
  const cool = temp / (iterations + 1);

  for (let step = 0; step < iterations; step++) {
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);

    // every pair repels
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = xs[i]! - xs[j]!;
        let ddy = ys[i]! - ys[j]!;
        let d = Math.hypot(ddx, ddy);
        if (d < 0.01) {
          // coincident: nudge apart deterministically
          ddx = (i - j) * 0.01;
          ddy = 0.01;
          d = Math.hypot(ddx, ddy);
        }
        const f = (K * K) / d;
        dx[i]! += (ddx / d) * f;
        dy[i]! += (ddy / d) * f;
        dx[j]! -= (ddx / d) * f;
        dy[j]! -= (ddy / d) * f;
      }
    }
    // links attract
    for (const [a, b] of edges) {
      const ddx = xs[a]! - xs[b]!;
      const ddy = ys[a]! - ys[b]!;
      const d = Math.max(Math.hypot(ddx, ddy), 0.01);
      const f = (d * d) / K;
      dx[a]! -= (ddx / d) * f;
      dy[a]! -= (ddy / d) * f;
      dx[b]! += (ddx / d) * f;
      dy[b]! += (ddy / d) * f;
    }
    // pull toward the centre, then move — capped by the cooling temperature
    for (let i = 0; i < n; i++) {
      dx[i]! -= xs[i]! * gx * K * 0.1;
      dy[i]! -= ys[i]! * gy * K * 0.1;
      const d = Math.hypot(dx[i]!, dy[i]!);
      if (d > 0) {
        const m = Math.min(d, temp);
        xs[i] = xs[i]! + (dx[i]! / d) * m;
        ys[i] = ys[i]! + (dy[i]! / d) * m;
      }
    }
    temp -= cool;
  }

  // unlinked nodes (untagged items) drift far out and would squeeze the real
  // graph when fitting — pull them radially onto a ring just outside it
  const linked = new Set(edges.flat());
  if (linked.size > 1 && linked.size < n) {
    const lx = [...linked].map((i) => xs[i]!);
    const ly = [...linked].map((i) => ys[i]!);
    const mx = (Math.min(...lx) + Math.max(...lx)) / 2;
    const my = (Math.min(...ly) + Math.max(...ly)) / 2;
    const rx = Math.max((Math.max(...lx) - Math.min(...lx)) / 2, K) * 1.15;
    const ry = Math.max((Math.max(...ly) - Math.min(...ly)) / 2, K) * 1.15;
    for (let i = 0; i < n; i++) {
      if (linked.has(i)) continue;
      const ex = (xs[i]! - mx) / rx;
      const ey = (ys[i]! - my) / ry;
      const e = Math.hypot(ex, ey);
      if (e > 1) {
        xs[i] = mx + (xs[i]! - mx) / e;
        ys[i] = my + (ys[i]! - my) / e;
      }
    }
  }

  // fit to the frame: uniform scale (keeps the shape), centred, and never
  // blown up so far that a tiny graph fills the screen
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const availW = size.width - 2 * margin.x;
  const availH = size.height - 2 * margin.y;
  const scale = Math.min(
    maxX > minX ? availW / (maxX - minX) : Infinity,
    maxY > minY ? availH / (maxY - minY) : Infinity,
    3,
  );
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  net.nodes.forEach((node, i) =>
    out.set(node.id, { x: cx + (xs[i]! - midX) * scale, y: cy + (ys[i]! - midY) * scale }),
  );
  return out;
}
