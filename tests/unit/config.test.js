import { describe, it, expect, beforeAll } from 'vitest';

// config.js is a plain browser script that attaches helpers to `window`.
// Under jsdom, importing it executes that top-level code, so we can exercise
// the pure functions exactly as the site does.
beforeAll(async () => {
  await import('../../config.js');
});

describe('idealabEsc', () => {
  it('neutralizes HTML metacharacters', () => {
    expect(window.idealabEsc('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
    expect(window.idealabEsc(`"'&<>`)).toBe('&quot;&#39;&amp;&lt;&gt;');
  });
  it('coerces nullish input to empty string', () => {
    expect(window.idealabEsc(null)).toBe('');
    expect(window.idealabEsc(undefined)).toBe('');
  });
});

describe('idealabSafeUrl', () => {
  it('allows http(s), mailto, and relative URLs', () => {
    expect(window.idealabSafeUrl('https://example.com/cv.pdf')).toBe('https://example.com/cv.pdf');
    expect(window.idealabSafeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(window.idealabSafeUrl('person?id=mert-karakas')).toBe('person?id=mert-karakas');
    expect(window.idealabSafeUrl('#top')).toBe('#top');
  });
  it('rejects javascript: and data: schemes', () => {
    expect(window.idealabSafeUrl('javascript:alert(1)')).toBe('#');
    expect(window.idealabSafeUrl('JaVaScRiPt:alert(1)')).toBe('#');
    expect(window.idealabSafeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });
});

describe('idealabThumbUrl', () => {
  it('maps an uploaded 512px avatar to its 128px twin', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u/avatar-512.jpg?v=1';
    expect(window.idealabThumbUrl(url)).toContain('avatar-128.jpg');
  });
  it('adds a size hint for external providers', () => {
    expect(window.idealabThumbUrl('https://i.pravatar.cc/240?img=3')).toBe(
      'https://i.pravatar.cc/128?img=3',
    );
    expect(window.idealabThumbUrl('https://avatars.githubusercontent.com/u/1?v=4')).toContain(
      's=128',
    );
  });
  it('passes unknown URLs through untouched', () => {
    expect(window.idealabThumbUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });
});

describe('idealabCheckFile', () => {
  const spec = { accept: ['application/pdf'], maxMB: 5, label: 'PDF up to 5 MB' };
  it('returns null for a valid file', () => {
    const f = new File([new Uint8Array(1024)], 'resume.pdf', { type: 'application/pdf' });
    expect(window.idealabCheckFile(f, spec)).toBeNull();
  });
  it('rejects the wrong MIME type', () => {
    const f = new File(['x'], 'a.png', { type: 'image/png' });
    expect(window.idealabCheckFile(f, spec)).toMatch(/wrong file type/);
  });
  it('rejects a file over the size cap', () => {
    const f = new File([new Uint8Array(6 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
    expect(window.idealabCheckFile(f, spec)).toMatch(/MB/);
  });
});
