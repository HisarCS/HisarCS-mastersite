import type { Selection } from './facets';

/**
 * The explorer's state in the URL, so a filtered view can be sent as a link:
 * /research?interest=HCI+%26+AR&by=conference&view=graph. Pure and tested.
 *
 *   q=…            search text
 *   <facet key>=…  one param per ticked value (repeatable)
 *   by=<facet>     grouping ("none" when the page groups by default)
 *   view=graph     grid is the default
 *   style=…        graph style, when not the default
 *
 * Anything else (the entry route's `id`, tracking params, junk) is ignored.
 */

export interface ExplorerUrlState {
  query: string;
  selected: Selection;
  group: string | null;
  view: 'grid' | 'graph';
  style: string;
}

type Defaults = Pick<ExplorerUrlState, 'group' | 'view' | 'style'>;

export function encodeExplorerState(s: ExplorerUrlState, defaults: Defaults): string {
  const p = new URLSearchParams();
  if (s.query.trim()) p.set('q', s.query.trim());
  for (const [key, values] of Object.entries(s.selected)) for (const v of values) p.append(key, v);
  if (s.group !== defaults.group) p.set('by', s.group ?? 'none');
  if (s.view !== defaults.view) p.set('view', s.view);
  if (s.style !== defaults.style) p.set('style', s.style);
  const out = p.toString();
  return out ? `?${out}` : '';
}

export function decodeExplorerState(
  search: string,
  opts: { facetKeys: string[]; styles: string[]; defaults: Defaults },
): ExplorerUrlState {
  const p = new URLSearchParams(search);
  const selected: Selection = {};
  for (const key of opts.facetKeys) {
    const values = [...new Set(p.getAll(key).filter((v) => v.trim()))];
    if (values.length) selected[key] = values;
  }
  const by = p.get('by');
  const view = p.get('view');
  const style = p.get('style');
  return {
    query: p.get('q') ?? '',
    selected,
    group: by === 'none' ? null : by && opts.facetKeys.includes(by) ? by : opts.defaults.group,
    view: view === 'graph' || view === 'grid' ? view : opts.defaults.view,
    style: style && opts.styles.includes(style) ? style : opts.defaults.style,
  };
}
