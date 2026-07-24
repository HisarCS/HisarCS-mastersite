import { describe, it, expect } from 'vitest';
import { esc, safeUrl } from '../../lib/util/html';
import { thumbUrl, checkFile, type UploadSpec } from '../../lib/util/media';
import { academicYear, cohortFor } from '../../lib/util/date';
import { isLocalHost } from '../../lib/env';

describe('esc', () => {
  it('neutralizes HTML metacharacters', () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(esc(`"'&<>`)).toBe('&quot;&#39;&amp;&lt;&gt;');
  });
  it('coerces nullish input to empty string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

describe('safeUrl', () => {
  it('allows http(s), mailto, and relative URLs', () => {
    expect(safeUrl('https://example.com/cv.pdf')).toBe('https://example.com/cv.pdf');
    expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(safeUrl('person?id=mert-karakas')).toBe('person?id=mert-karakas');
    expect(safeUrl('#top')).toBe('#top');
  });
  it('rejects javascript: and data: schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#');
    expect(safeUrl('JaVaScRiPt:alert(1)')).toBe('#');
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });
});

describe('thumbUrl', () => {
  it('maps an uploaded 512px avatar to its 128px twin', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u/avatar-512.jpg?v=1';
    expect(thumbUrl(url)).toContain('avatar-128.jpg');
  });
  it('adds a size hint for external providers', () => {
    expect(thumbUrl('https://i.pravatar.cc/240?img=3')).toBe('https://i.pravatar.cc/128?img=3');
    expect(thumbUrl('https://avatars.githubusercontent.com/u/1?v=4')).toContain('s=128');
  });
  it('passes unknown URLs through untouched', () => {
    expect(thumbUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });
});

describe('checkFile', () => {
  const spec: UploadSpec = { accept: ['application/pdf'], maxMB: 5, label: 'PDF up to 5 MB' };
  it('returns null for a valid file', () => {
    const f = new File([new Uint8Array(1024)], 'resume.pdf', { type: 'application/pdf' });
    expect(checkFile(f, spec)).toBeNull();
  });
  it('rejects the wrong MIME type', () => {
    const f = new File(['x'], 'a.png', { type: 'image/png' });
    expect(checkFile(f, spec)).toMatch(/wrong file type/);
  });
  it('rejects a file over the size cap', () => {
    const f = new File([new Uint8Array(6 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
    expect(checkFile(f, spec)).toMatch(/MB/);
  });
});

describe('isLocalHost', () => {
  it('treats loopback, bare names, .local and private LAN as local', () => {
    for (const h of [
      'localhost',
      '127.0.0.1',
      'mac-mini',
      'studio.local',
      '192.168.1.5',
      '10.0.0.2',
    ])
      expect(isLocalHost(h)).toBe(true);
  });
  it('treats real public hosts as not local', () => {
    for (const h of ['hisarcs.github.io', 'idealab.hisarcs.com'])
      expect(isLocalHost(h)).toBe(false);
  });
});

describe('academicYear / cohortFor', () => {
  it('flips on July 1', () => {
    expect(academicYear(new Date('2026-06-30'))).toBe(2026);
    expect(academicYear(new Date('2026-07-01'))).toBe(2027);
  });
  it('classifies students vs alumni relative to the academic year', () => {
    const now = new Date('2026-09-01'); // academic year 2027
    expect(cohortFor(2027, now)).toBe('student');
    expect(cohortFor(2026, now)).toBe('alumni');
  });
});
