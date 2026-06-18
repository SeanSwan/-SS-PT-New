import { describe, expect, it } from 'vitest';
import {
  getYouTubeId,
  getVimeoId,
  isEmbeddableVideoUrl,
  isDirectVideoFile,
  getVideoPoster,
  getVideoEmbedUrl,
} from './bootcampVideoEmbed';

describe('bootcampVideoEmbed', () => {
  it('extracts YouTube ids from common URL shapes', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://r2.example.com/clip.mp4')).toBeNull();
    expect(getYouTubeId(null)).toBeNull();
  });

  it('extracts Vimeo ids', () => {
    expect(getVimeoId('https://vimeo.com/123456789')).toBe('123456789');
    expect(getVimeoId('https://player.vimeo.com/video/123456789')).toBe('123456789');
    expect(getVimeoId('https://youtu.be/dQw4w9WgXcQ')).toBeNull();
  });

  it('classifies direct video files vs embeddable URLs', () => {
    expect(isDirectVideoFile('https://r2.example.com/squat-loop.webm')).toBe(true);
    expect(isDirectVideoFile('https://r2.example.com/squat.mp4?v=2')).toBe(true);
    expect(isDirectVideoFile('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isEmbeddableVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isEmbeddableVideoUrl('https://r2.example.com/squat.mp4')).toBe(false);
  });

  it('derives a YouTube poster but not for files/vimeo', () => {
    expect(getVideoPoster('https://youtu.be/dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(getVideoPoster('https://r2.example.com/squat.mp4')).toBeNull();
  });

  it('builds privacy-friendly autoplay embed URLs', () => {
    expect(getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1');
    expect(getVideoEmbedUrl('https://vimeo.com/123456789'))
      .toBe('https://player.vimeo.com/video/123456789?autoplay=1');
    expect(getVideoEmbedUrl('https://r2.example.com/squat.mp4')).toBeNull();
  });
});
