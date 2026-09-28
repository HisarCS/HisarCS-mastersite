import { describe, it, expect } from 'vitest';
import { parseCompareSpec, parseTimelineSpec, parseVideoSpec } from '../../lib/util/fenceSpecs';

describe('parseVideoSpec', () => {
  const embed = (url: string) => parseVideoSpec(url).ok?.embed;

  it('turns every YouTube link form into a privacy-mode embed', () => {
    const e = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    expect(embed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(e);
    expect(embed('https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10')).toBe(e);
    expect(embed('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe(e);
    expect(embed('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(e);
    expect(embed('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(e);
  });

  it('turns Vimeo links into a do-not-track player embed', () => {
    const e = 'https://player.vimeo.com/video/76979871?dnt=1';
    expect(embed('https://vimeo.com/76979871')).toBe(e);
    expect(embed('https://player.vimeo.com/video/76979871')).toBe(e);
  });

  it('takes the lines after the URL as the caption', () => {
    expect(parseVideoSpec('https://youtu.be/dQw4w9WgXcQ\nThe growth\ntime-lapse').ok).toEqual({
      provider: 'youtube',
      embed: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      caption: 'The growth time-lapse',
    });
  });

  it('refuses any other host, fake look-alikes, and malformed ids', () => {
    expect(parseVideoSpec('https://evil.org/watch?v=dQw4w9WgXcQ').error).toMatch(
      /YouTube or Vimeo/,
    );
    expect(parseVideoSpec('https://youtube.com.evil.org/watch?v=dQw4w9WgXcQ').error).toMatch(
      /YouTube or Vimeo/,
    );
    expect(parseVideoSpec('http://youtu.be/dQw4w9WgXcQ').error).toMatch(/https/);
    expect(parseVideoSpec('https://youtu.be/<script>').error).toMatch(/video id/);
    expect(parseVideoSpec('').error).toMatch(/add a/);
  });
});

describe('parseTimelineSpec', () => {
  it('reads "date | milestone" lines in order', () => {
    expect(parseTimelineSpec('Sep 2024 | First prototype\n2025 | IDC paper').ok!.items).toEqual([
      { date: 'Sep 2024', text: 'First prototype' },
      { date: '2025', text: 'IDC paper' },
    ]);
  });

  it('needs both a date and a milestone on every line', () => {
    expect(parseTimelineSpec('just words').error).toMatch(/date \| milestone/);
    expect(parseTimelineSpec('2025 |').error).toMatch(/date \| milestone/);
    expect(parseTimelineSpec('').error).toMatch(/at least one/);
  });
});

describe('parseCompareSpec', () => {
  it('takes exactly two images: before, then after', () => {
    const r = parseCompareSpec('![First drum](a/one-w2400.jpg)\n![Two wheels](a/two-w2400.jpg)');
    expect(r.ok).toEqual({
      before: { src: 'a/one-w2400.jpg', caption: 'First drum' },
      after: { src: 'a/two-w2400.jpg', caption: 'Two wheels' },
    });
  });

  it('rejects anything but two image lines', () => {
    expect(parseCompareSpec('![only](a.jpg)').error).toMatch(/two images/);
    expect(parseCompareSpec('![a](a.jpg)\n![b](b.jpg)\n![c](c.jpg)').error).toMatch(/two images/);
    expect(parseCompareSpec('![a](a.jpg)\nnot an image').error).toMatch(/!\[caption\]\(image\)/);
  });
});
