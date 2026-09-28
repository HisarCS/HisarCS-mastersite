import type { CSSProperties } from 'react';
import { paletteColor } from '@/lib/util/palette';

/**
 * Looks for the network graph. One entry = one theme: its colors (fed to the
 * SVG as CSS custom properties AND to the GPU layer, so the two can't drift),
 * how hubs are filled, where labels sit, and whether the animated WebGPU
 * renderer draws it. Adding a theme is adding an entry.
 */
export interface GraphTheme {
  label: string;
  colors: {
    background: string;
    link: string;
    linkOn: string;
    item: string;
    hub: string;
    label: string;
    hubLabel: string;
  };
  /** per-hub fill (paper: the tag's palette color); default colors.hub */
  hubFill?: (value: string) => string;
  /** Obsidian puts labels under the dot; paper above */
  labelsBelow: boolean;
  /** draw links + dots with animoo on WebGPU when the browser has it */
  gpu: boolean;
}

export const GRAPH_THEMES = {
  paper: {
    label: 'Paper',
    colors: {
      background: '#ffffff',
      link: 'rgba(20, 20, 20, 0.14)',
      linkOn: '#e8542f',
      item: '#141414',
      hub: '#e8542f',
      label: '#8a8578',
      hubLabel: '#141414',
    },
    hubFill: paletteColor,
    labelsBelow: false,
    gpu: false,
  },
  obsidian: {
    label: 'Obsidian',
    colors: {
      background: '#1e1e24',
      link: 'rgba(138, 124, 246, 0.22)',
      linkOn: '#8b7cf6',
      item: '#8f86c9',
      hub: '#7b6cf6',
      label: '#9d9daa',
      hubLabel: '#e4e4ee',
    },
    labelsBelow: true,
    gpu: true,
  },
} satisfies Record<string, GraphTheme>;

export type GraphThemeKey = keyof typeof GRAPH_THEMES;

/** The theme's colors as the CSS custom properties Explorer.module.css reads. */
export function themeVars(t: GraphTheme): CSSProperties {
  const c = t.colors;
  return {
    '--g-bg': c.background,
    '--g-link': c.link,
    '--g-link-on': c.linkOn,
    '--g-item': c.item,
    '--g-hub': c.hub,
    '--g-label': c.label,
    '--g-hub-label': c.hubLabel,
  } as CSSProperties;
}
