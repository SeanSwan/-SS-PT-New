/**
 * Demo-board media resolution (2026-06-18)
 * ----------------------------------------
 * Sean's GIF-preview -> click-for-video pipeline: a short R2 loop
 * (previewVideoUrl) plays inline; the full video opens "for depth". These tests
 * lock the resolution + graceful fallbacks (no previewVideoUrl yet -> reuse a
 * file videoUrl as the loop; YouTube -> derive a poster, no inline loop).
 */
import { describe, expect, it } from 'vitest';
import { getExerciseDemoMedia, getDemoMediaPillLabel, getStationDemoReadiness } from './BootcampDemoMode';
import type { BootcampExercise } from '../../hooks/useBootcampAPI';

const ex = (over: Partial<BootcampExercise>): BootcampExercise =>
  ({ exerciseName: 'Squat', durationSec: 40, restSec: 20, sortOrder: 0, isCardioFinisher: false, muscleTargets: '', ...over } as BootcampExercise);

describe('getExerciseDemoMedia', () => {
  it('uses a dedicated previewVideoUrl loop when present', () => {
    const m = getExerciseDemoMedia(ex({
      previewVideoUrl: 'https://r2.example.com/squat-loop.webm',
      videoUrl: 'https://r2.example.com/squat-full.mp4',
    }));
    expect(m.previewUrl).toBe('https://r2.example.com/squat-loop.webm');
    expect(m.previewIsFile).toBe(true);
    expect(m.videoUrl).toBe('https://r2.example.com/squat-full.mp4'); // full video for depth
  });

  it('treats a preview-only loop as demo-ready media', () => {
    const exercise = ex({ previewVideoUrl: 'https://r2.example.com/squat-loop.webm' });
    const m = getExerciseDemoMedia(exercise);

    expect(m.previewUrl).toBe('https://r2.example.com/squat-loop.webm');
    expect(m.previewIsFile).toBe(true);
    expect(getDemoMediaPillLabel(m)).toBe('Looping clip');
    expect(getStationDemoReadiness([exercise])).toBe('1/1 demos ready');
  });

  it('falls back to looping a direct-file videoUrl when there is no preview loop', () => {
    const m = getExerciseDemoMedia(ex({ videoUrl: 'https://r2.example.com/squat.mp4' }));
    expect(m.previewUrl).toBe('https://r2.example.com/squat.mp4');
    expect(m.previewIsFile).toBe(true);
  });

  it('does NOT loop a YouTube videoUrl inline, but derives a poster + marks it embeddable', () => {
    const m = getExerciseDemoMedia(ex({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }));
    expect(m.previewUrl).toBeNull();
    expect(m.previewIsFile).toBe(false);
    expect(m.canPreviewVideo).toBe(false);
    expect(m.isEmbedVideo).toBe(true);
    expect(m.poster).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('uses catalogVideoSample as the video source and flags it as catalog', () => {
    const m = getExerciseDemoMedia(ex({
      catalogVideoSample: { videoUrl: 'https://youtu.be/dQw4w9WgXcQ', thumbnailUrl: null },
    }));
    expect(m.videoUrl).toBe('https://youtu.be/dQw4w9WgXcQ');
    expect(m.isCatalogVideo).toBe(true);
  });

  it('prefers an explicit thumbnailUrl over a derived poster', () => {
    const m = getExerciseDemoMedia(ex({
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      thumbnailUrl: 'https://r2.example.com/poster.jpg',
    }));
    expect(m.poster).toBe('https://r2.example.com/poster.jpg');
  });

  it('reports no media when the exercise has none', () => {
    const m = getExerciseDemoMedia(ex({}));
    expect(m.videoUrl).toBeNull();
    expect(m.previewUrl).toBeNull();
    expect(m.poster).toBeNull();
  });
});

describe('getDemoMediaPillLabel', () => {
  it('labels accurately by media kind', () => {
    expect(getDemoMediaPillLabel(getExerciseDemoMedia(ex({})))).toBe('Media slot');
    expect(getDemoMediaPillLabel(getExerciseDemoMedia(ex({ videoUrl: 'https://r2.example.com/a.mp4' })))).toBe('Looping clip');
    expect(getDemoMediaPillLabel(getExerciseDemoMedia(ex({ videoUrl: 'https://youtu.be/dQw4w9WgXcQ' })))).toBe('Tap to play');
    expect(getDemoMediaPillLabel(getExerciseDemoMedia(ex({
      catalogVideoSample: { videoUrl: 'https://youtu.be/dQw4w9WgXcQ' },
    })))).toBe('Catalog video');
  });
});
