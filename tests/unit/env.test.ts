import { afterEach, describe, it, expect, vi } from 'vitest';
import { mocksEnabled } from '../../lib/env';

describe('mocksEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off by default, even on localhost — a missing backend must not look like data', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    expect(mocksEnabled('localhost')).toBe(false);
  });

  it('is on only when asked for, on a local host', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    expect(mocksEnabled('localhost')).toBe(true);
    expect(mocksEnabled('127.0.0.1')).toBe(true);
  });

  it('is never on in production, whatever the flag says', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    expect(mocksEnabled('hisarcs.github.io')).toBe(false);
  });
});
