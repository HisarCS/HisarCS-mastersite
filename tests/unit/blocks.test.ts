import { describe, it, expect } from 'vitest';
import { emptyPage, normalizePage, PAGE_VERSION } from '../../lib/domain/blocks';

describe('normalizePage', () => {
  it('rejects non-objects and shapes without a blocks array', () => {
    expect(normalizePage(null)).toBeNull();
    expect(normalizePage(undefined)).toBeNull();
    expect(normalizePage('x')).toBeNull();
    expect(normalizePage({})).toBeNull();
    expect(normalizePage({ blocks: 'nope' })).toBeNull();
  });

  it('keeps valid blocks and defaults the version', () => {
    const p = normalizePage({ blocks: [{ type: 'text', data: { md: 'hi' } }] });
    expect(p).not.toBeNull();
    expect(p!.version).toBe(PAGE_VERSION);
    expect(p!.blocks).toHaveLength(1);
  });

  it('preserves unknown block types (forward compatibility)', () => {
    // a newer client may have written a block type this client doesn't know;
    // it must survive a read → save round-trip untouched
    const p = normalizePage({
      version: 1,
      blocks: [
        { type: 'text', data: { md: 'a' } },
        { type: 'hologram', data: { beam: 3 } },
      ],
    });
    expect(p!.blocks).toHaveLength(2);
    expect(p!.blocks[1]).toEqual({ type: 'hologram', data: { beam: 3 } });
  });

  it('drops entries that are not block-shaped at all', () => {
    const p = normalizePage({
      blocks: [null, 42, { noType: true }, { type: 'quote', data: { text: 'q' } }],
    });
    expect(p!.blocks).toHaveLength(1);
  });
});

describe('emptyPage', () => {
  it('is the current version with no blocks', () => {
    expect(emptyPage()).toEqual({ version: PAGE_VERSION, blocks: [] });
  });
});
