'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  facetValues,
  filterItems,
  groupItems,
  mergeCase,
  type Facet,
  type Selection,
} from '@/lib/domain/facets';
import { decodeExplorerState, encodeExplorerState } from '@/lib/domain/explorerUrl';
import { buildNetwork } from '@/lib/graph/network';
import { paletteColor } from '@/lib/util/palette';
import { GRAPH_THEMES, type GraphThemeKey } from './graphThemes';
import { NetworkGraph } from './NetworkGraph';
import styles from './Explorer.module.css';

/** chip rows longer than this collapse behind "+N more" */
const CHIPS_SHOWN = 12;

export interface ExplorerApi {
  /** tick/untick a facet value — for in-card tag buttons */
  toggle: (facet: string, value: string) => void;
  isOn: (facet: string, value: string) => boolean;
}

/**
 * A directory you can search, filter, group, and see as a network — the one
 * shell both /research and /members use. Everything it offers comes from the
 * `facets` table it is given; the page supplies how one group of items looks
 * as a grid, and where an item opens. The state lives in the URL
 * (lib/domain/explorerUrl.ts), so any view can be shared as a link.
 */
export function Explorer<T>({
  items,
  facets: rawFacets,
  text,
  itemId,
  itemLabel,
  onOpen,
  renderGrid,
  noun,
  searchHint,
  defaultGroup = null,
  sectionTitle = (_facet, value) => value,
}: {
  items: T[];
  facets: Facet<T>[];
  text: (item: T) => string;
  itemId: (item: T) => string;
  itemLabel: (item: T) => string;
  onOpen: (item: T) => void;
  renderGrid: (items: T[], api: ExplorerApi) => ReactNode;
  /** "research", "members" — used in counts and labels */
  noun: string;
  /** search box hint, e.g. "title, interest, conference…" */
  searchHint: string;
  /** facet key to group the grid by at first (null = one flat grid) */
  defaultGroup?: string | null;
  sectionTitle?: (facet: Facet<T>, value: string) => string;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Selection>({});
  const [groupKey, setGroupKey] = useState<string | null>(defaultGroup);
  const [view, setView] = useState<'grid' | 'graph'>('grid');
  const [themeKey, setThemeKey] = useState<GraphThemeKey>('paper');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // "robotics" and "Robotics" are one value everywhere below
  const facets = useMemo(() => rawFacets.map((f) => mergeCase(f, items)), [rawFacets, items]);
  const valueLists = useMemo(
    () => new Map(facets.map((f) => [f.key, facetValues(items, f)])),
    [facets, items],
  );
  /** a value as the facet displays it (card tags and links arrive in any casing) */
  const canon = useCallback(
    (facet: string, value: string) =>
      valueLists.get(facet)?.find((v) => v.value.toLowerCase() === value.toLowerCase())?.value ??
      value,
    [valueLists],
  );
  /** the ticked values, canonicalized */
  const active = useMemo<Selection>(
    () =>
      Object.fromEntries(
        Object.entries(selected).map(([k, vs]) => [k, [...new Set(vs.map((v) => canon(k, v)))]]),
      ),
    [selected, canon],
  );

  // ---- URL ⇄ state: read once on mount, then mirror every change ----
  const urlOpts = useMemo(
    () => ({
      facetKeys: rawFacets.map((f) => f.key),
      styles: Object.keys(GRAPH_THEMES),
      defaults: { group: defaultGroup, view: 'grid' as const, style: 'paper' },
    }),
    [rawFacets, defaultGroup],
  );
  const [urlRead, setUrlRead] = useState(false);
  useEffect(() => {
    const s = decodeExplorerState(window.location.search, urlOpts);
    setQuery(s.query);
    setSelected(s.selected);
    setGroupKey(s.group);
    setView(s.view);
    setThemeKey(s.style as GraphThemeKey);
    setUrlRead(true);
  }, [urlOpts]);
  useEffect(() => {
    if (!urlRead) return; // don't overwrite a shared link before reading it
    const qs = encodeExplorerState(
      { query, selected: active, group: groupKey, view, style: themeKey },
      urlOpts.defaults,
    );
    const url = `${window.location.pathname}${qs}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
      window.history.replaceState(window.history.state, '', url);
  }, [urlRead, query, active, groupKey, view, themeKey, urlOpts]);

  const shown = useMemo(
    () => filterItems(items, { query, selected: active }, facets, text),
    [items, query, active, facets, text],
  );
  const group = facets.find((f) => f.key === groupKey) ?? null;
  // the graph always needs hubs: fall back to the first facet
  const graphFacet = group ?? facets[0]!;
  const network = useMemo(
    () => buildNetwork(shown, graphFacet, { id: itemId, label: itemLabel }),
    [shown, graphFacet, itemId, itemLabel],
  );

  const isOn = (facet: string, value: string) =>
    active[facet]?.includes(canon(facet, value)) ?? false;
  const toggle = (facet: string, raw: string) => {
    const value = canon(facet, raw);
    setSelected((s) => {
      const cur = s[facet] ?? [];
      const on = cur.some((v) => canon(facet, v) === value);
      const next = on ? cur.filter((v) => canon(facet, v) !== value) : [...cur, value];
      return { ...s, [facet]: next };
    });
  };
  const api: ExplorerApi = { toggle, isOn };
  const filtering = query.trim() !== '' || Object.values(active).some((v) => v.length > 0);
  const clear = () => {
    setQuery('');
    setSelected({});
  };
  const selectedHubs = new Set(
    Object.entries(active).flatMap(([k, vs]) => vs.map((v) => `${k}:${v}`)),
  );

  return (
    <section className={styles.explorer} aria-label={`Explore ${noun}`}>
      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder={`Search ${noun} — ${searchHint}`}
          aria-label={`Search ${noun}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.segment} role="group" aria-label="View">
          {(['grid', 'graph'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              className={view === v ? styles.segOn : ''}
              onClick={() => setView(v)}
            >
              {v === 'grid' ? 'Grid' : 'Graph'}
            </button>
          ))}
        </div>
        {view === 'graph' && (
          <div className={styles.segment} role="group" aria-label="Graph style">
            {(Object.keys(GRAPH_THEMES) as GraphThemeKey[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={themeKey === k}
                className={themeKey === k ? styles.segOn : ''}
                onClick={() => setThemeKey(k)}
              >
                {GRAPH_THEMES[k].label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.groupRow}>
        <span className={styles.rowLabel}>Group by</span>
        <div className={styles.segment} role="group" aria-label="Group by">
          {view === 'grid' && (
            <button
              type="button"
              aria-pressed={group === null}
              className={group === null ? styles.segOn : ''}
              onClick={() => setGroupKey(null)}
            >
              None
            </button>
          )}
          {facets.map((f) => {
            const on = view === 'graph' ? graphFacet.key === f.key : group?.key === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                className={on ? styles.segOn : ''}
                onClick={() => setGroupKey(f.key)}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.filters}>
        {facets.map((f) => {
          const values = valueLists.get(f.key) ?? [];
          if (values.length === 0) return null;
          const open = expanded[f.key] ?? false;
          // ticked values stay visible even when the row is collapsed
          const visible = open
            ? values
            : values.filter((v, i) => i < CHIPS_SHOWN || isOn(f.key, v.value));
          return (
            <div key={f.key} className={styles.filterRow}>
              <span className={styles.rowLabel}>{f.label}</span>
              <div className={styles.chips} role="group" aria-label={`Filter by ${f.label}`}>
                {visible.map(({ value, count }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isOn(f.key, value)}
                    className={`${styles.chip} ${isOn(f.key, value) ? styles.chipOn : ''}`}
                    style={{ '--chip-c': paletteColor(value) } as CSSProperties}
                    onClick={() => toggle(f.key, value)}
                  >
                    {value} <span className={styles.count}>{count}</span>
                  </button>
                ))}
                {values.length > visible.length && (
                  <button
                    type="button"
                    className={styles.more}
                    onClick={() => setExpanded((e) => ({ ...e, [f.key]: true }))}
                  >
                    +{values.length - visible.length} more
                  </button>
                )}
                {open && values.length > CHIPS_SHOWN && (
                  <button
                    type="button"
                    className={styles.more}
                    onClick={() => setExpanded((e) => ({ ...e, [f.key]: false }))}
                  >
                    fewer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.status} aria-live="polite">
        {filtering ? `${shown.length} of ${items.length} ${noun}` : `${items.length} ${noun}`}
        {filtering && (
          <button type="button" className={styles.clear} onClick={clear}>
            Clear
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className={styles.empty}>
          Nothing matches.{' '}
          <button type="button" className={styles.clear} onClick={clear}>
            Clear search and filters
          </button>
        </div>
      ) : view === 'graph' ? (
        <NetworkGraph
          network={network}
          selectedHubs={selectedHubs}
          onItem={onOpen}
          onHub={toggle}
          label={`${noun} by ${graphFacet.label.toLowerCase()}`}
          theme={GRAPH_THEMES[themeKey]}
          imageName={`idealab-${noun}-by-${graphFacet.key}`}
        />
      ) : group ? (
        groupItems(shown, group).map(({ value, items: list }) => (
          <section key={value ?? '—'} className={styles.section}>
            <h2 className={styles.sectionHeading}>
              {value === null ? `No ${group.label.toLowerCase()}` : sectionTitle(group, value)}
              <span className={styles.count}>{list.length}</span>
            </h2>
            {renderGrid(list, api)}
          </section>
        ))
      ) : (
        renderGrid(shown, api)
      )}
    </section>
  );
}
