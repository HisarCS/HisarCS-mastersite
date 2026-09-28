import { describe, it, expect } from 'vitest';
import { parseVideoSpec } from '../../lib/util/fenceSpecs';

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
