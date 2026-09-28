import { describe, it, expect } from 'vitest';
import {
  decodeExplorerState,
  encodeExplorerState,
  type ExplorerUrlState,
} from '../../lib/domain/explorerUrl';

const OPTS = {
  facetKeys: ['interest', 'conference', 'year'],
  styles: ['paper', 'obsidian'],
  defaults: { group: null, view: 'grid', style: 'paper' } as const,
};
const DEFAULT: ExplorerUrlState = {
  query: '',
  selected: {},
  group: null,
  view: 'grid',
  style: 'paper',
};

describe('encodeExplorerState', () => {
  it('the default view is a clean URL', () => {
    expect(encodeExplorerState(DEFAULT, OPTS.defaults)).toBe('');
  });

  it('writes only what differs, one param per ticked value', () => {
    const s = encodeExplorerState(
      {
        query: 'robot kit',
        selected: { interest: ['HCI & AR', 'Robotics'], year: [] },
        group: 'conference',
        view: 'graph',
        style: 'obsidian',
      },
      OPTS.defaults,
    );
    expect(s).toBe(
      '?q=robot+kit&interest=HCI+%26+AR&interest=Robotics&by=conference&view=graph&style=obsidian',
    );
  });

  it('records "no grouping" when the page groups by default (members: by class)', () => {
    expect(encodeExplorerState(DEFAULT, { ...OPTS.defaults, group: 'class' })).toBe('?by=none');
  });
});

describe('decodeExplorerState', () => {
  it('round-trips', () => {
    const state: ExplorerUrlState = {
      query: 'otto',
      selected: { interest: ['Parametric Design'], conference: ['SCF'] },
      group: 'year',
      view: 'graph',
      style: 'obsidian',
    };
    expect(decodeExplorerState(encodeExplorerState(state, OPTS.defaults), OPTS)).toEqual(state);
  });

  it('an empty search is the default state', () => {
    expect(decodeExplorerState('', OPTS)).toEqual(DEFAULT);
  });

  it('ignores the entry id, unknown params, and invalid values', () => {
    expect(
      decodeExplorerState('?id=otto&utm_source=x&by=nope&view=list&style=neon&color=red', OPTS),
    ).toEqual(DEFAULT);
  });

  it('by=none means no grouping even when the page default groups', () => {
    expect(
      decodeExplorerState('?by=none', { ...OPTS, defaults: { ...OPTS.defaults, group: 'class' } })
        .group,
    ).toBeNull();
  });

  it('drops empty and duplicate values', () => {
    expect(decodeExplorerState('?interest=&interest=AI&interest=AI', OPTS).selected).toEqual({
      interest: ['AI'],
    });
  });
});
