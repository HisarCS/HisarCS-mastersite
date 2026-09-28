import { describe, it, expect } from 'vitest';
import type { Facet } from '../../lib/domain/facets';
import { buildNetwork, layoutNetwork, type Network } from '../../lib/graph/network';

interface Doc {
  id: string;
  tags: string[];
}
const TAGS: Facet<Doc> = { key: 'tag', label: 'Tag', values: (d) => d.tags };
const DOCS: Doc[] = [
  { id: 'a', tags: ['AI', 'Robotics'] },
  { id: 'b', tags: ['AI'] },
  { id: 'c', tags: ['Fabrication'] },
  { id: 'd', tags: [] },
];
const net = () =>
  buildNetwork(DOCS, TAGS, {
    id: (d) => d.id,
    label: (d) => d.id.toUpperCase(),
  });

describe('buildNetwork', () => {
  it('has one node per item and one hub per value in use', () => {
    const n = net();
    expect(n.nodes.filter((x) => x.kind === 'item').map((x) => x.id)).toEqual([
      'item:a',
      'item:b',
      'item:c',
      'item:d',
    ]);
    expect(n.nodes.filter((x) => x.kind === 'hub').map((x) => x.label)).toEqual([
      'AI',
      'Fabrication',
      'Robotics',
    ]);
  });

  it('links each item to each of its values; hub weight is its item count', () => {
    const n = net();
    expect(n.links).toHaveLength(4);
    expect(n.links).toContainEqual({ source: 'item:a', target: 'tag:AI' });
    expect(n.nodes.find((x) => x.id === 'tag:AI')!.weight).toBe(2);
    expect(n.nodes.find((x) => x.id === 'item:a')!.weight).toBe(2);
  });

  it('keeps items with no value as isolated nodes', () => {
    const n = net();
    expect(n.links.some((l) => l.source === 'item:d')).toBe(false);
    expect(n.nodes.some((x) => x.id === 'item:d')).toBe(true);
  });

  it('carries the item and facet value back for click handling', () => {
    const n = net();
    expect(n.nodes.find((x) => x.id === 'item:b')!.item).toBe(DOCS[1]);
    expect(n.nodes.find((x) => x.id === 'tag:AI')).toMatchObject({ facet: 'tag', value: 'AI' });
  });

  it('is empty for no items', () => {
    expect(buildNetwork([], TAGS, { id: (d) => d.id, label: (d) => d.id })).toEqual({
      nodes: [],
      links: [],
    });
  });
});

describe('layoutNetwork', () => {
  const SIZE = { width: 800, height: 520 };
  const dist = (p: Map<string, { x: number; y: number }>, a: string, b: string) =>
    Math.hypot(p.get(a)!.x - p.get(b)!.x, p.get(a)!.y - p.get(b)!.y);

  it('is deterministic for the same network', () => {
    const a = layoutNetwork(net(), SIZE);
    const b = layoutNetwork(net(), SIZE);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it('places every node at a finite point inside the frame', () => {
    const p = layoutNetwork(net(), SIZE);
    expect(p.size).toBe(net().nodes.length);
    for (const { x, y } of p.values()) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(SIZE.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(SIZE.height);
    }
  });

  it('pulls linked nodes closer than unlinked ones', () => {
    const p = layoutNetwork(net(), SIZE);
    // b is linked to AI, not to Fabrication
    expect(dist(p, 'item:b', 'tag:AI')).toBeLessThan(dist(p, 'item:b', 'tag:Fabrication'));
    // a and b share AI; c shares nothing with b
    expect(dist(p, 'item:a', 'item:b')).toBeLessThan(dist(p, 'item:c', 'item:b'));
  });

  it('never stacks two nodes on the same point', () => {
    const p = [...layoutNetwork(net(), SIZE).values()];
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        expect(Math.hypot(p[i]!.x - p[j]!.x, p[i]!.y - p[j]!.y)).toBeGreaterThan(5);
  });

  it('spreads a sparse, many-cluster graph instead of piling it on the frame edges', () => {
    // the real /research shape: ~15 items, ~20 tags, several disconnected clusters
    const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
    const docs: Doc[] = Array.from({ length: 15 }, (_, i) => ({
      id: `d${i}`,
      tags: i % 5 === 4 ? [] : [tags[i]!, tags[(i + 1) % tags.length]!],
    }));
    const n = buildNetwork(docs, TAGS, { id: (d) => d.id, label: (d) => d.id });
    const pts = [...layoutNetwork(n, SIZE).values()];
    const onEdge = pts.filter(
      (p) => p.x < 40 || p.x > SIZE.width - 40 || p.y < 40 || p.y > SIZE.height - 40,
    );
    expect(onEdge.length).toBeLessThanOrEqual(pts.length * 0.15);
    // and it still uses the frame rather than collapsing into the middle
    const xs = pts.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(SIZE.width * 0.5);
  });

  it("untagged items don't squeeze the connected graph into the middle", () => {
    const docs: Doc[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `d${i}`,
        tags: [`t${i % 3}`, `t${(i + 1) % 3}`],
      })),
      { id: 'lonely1', tags: [] },
      { id: 'lonely2', tags: [] },
    ];
    const n = buildNetwork(docs, TAGS, { id: (d) => d.id, label: (d) => d.id });
    const p = layoutNetwork(n, SIZE);
    const linked = n.nodes.filter((x) => x.weight > 0).map((x) => p.get(x.id)!);
    const xs = linked.map((q) => q.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(SIZE.width * 0.4);
  });

  it('handles the empty and single-node networks', () => {
    expect(layoutNetwork({ nodes: [], links: [] }, SIZE).size).toBe(0);
    const one: Network<Doc> = {
      nodes: [{ id: 'item:x', kind: 'item', label: 'X', weight: 0 }],
      links: [],
    };
    const p = layoutNetwork(one, SIZE).get('item:x')!;
    expect(p.x).toBeCloseTo(400, 0);
    expect(p.y).toBeCloseTo(260, 0);
  });
});
