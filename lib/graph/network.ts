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
 * Force-directed layout (Fruchterman–Reingold with a light pull to the
 * centre, so unlinked nodes don't drift to the walls). Seeded from the node
 * ids, so the same network always lands the same way — no jitter on reload.
 * O(n²) per step, which is fine at lab scale (a few hundred nodes).
 */
export function layoutNetwork<T>(
  net: Network<T>,
  size: { width: number; height: number },
  { iterations = 320, margin = 28 } = {},
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
  const rand = mulberry32(hashStr(net.nodes.map((node) => node.id).join('|')));
  const xs = net.nodes.map(() => cx + (rand() - 0.5) * size.width * 0.6);
  const ys = net.nodes.map(() => cy + (rand() - 0.5) * size.height * 0.6);
  const edges = net.links
    .map((l) => [index.get(l.source), index.get(l.target)] as const)
    .filter((e): e is readonly [number, number] => e[0] !== undefined && e[1] !== undefined);

  const k = Math.sqrt((size.width * size.height) / n) * 0.75;
  const gravity = 0.04;
  let temp = size.width / 8;
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
        const f = (k * k) / d;
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
      const f = (d * d) / k;
      dx[a]! -= (ddx / d) * f;
      dy[a]! -= (ddy / d) * f;
      dx[b]! += (ddx / d) * f;
      dy[b]! += (ddy / d) * f;
    }
    // move, capped by the temperature, then pulled toward the centre
    for (let i = 0; i < n; i++) {
      dx[i]! += (cx - xs[i]!) * gravity * k * 0.05;
      dy[i]! += (cy - ys[i]!) * gravity * k * 0.05;
      const d = Math.hypot(dx[i]!, dy[i]!);
      if (d > 0) {
        const m = Math.min(d, temp);
        xs[i] = xs[i]! + (dx[i]! / d) * m;
        ys[i] = ys[i]! + (dy[i]! / d) * m;
      }
      xs[i] = Math.min(size.width - margin, Math.max(margin, xs[i]!));
      ys[i] = Math.min(size.height - margin, Math.max(margin, ys[i]!));
    }
    temp -= cool;
  }

  net.nodes.forEach((node, i) => out.set(node.id, { x: xs[i]!, y: ys[i]! }));
  return out;
}
