/**
 * bannerObjectPosition - free crop coordinate regression tests.
 */
import { describe, expect, it } from 'vitest';
import {
  BANNER_OBJECT_POSITION_PRESETS,
  DEFAULT_BANNER_OBJECT_POSITION,
  isBannerObjectPosition,
  normalizeBannerCollagePhotos,
  normalizeBannerImageScale,
  normalizeBannerFrameHeight,
  normalizeBannerObjectPosition,
} from './profileService';

describe('BANNER_OBJECT_POSITION_PRESETS', () => {
  it('keeps the legacy 3x3 values readable for existing profile rows', () => {
    expect([...BANNER_OBJECT_POSITION_PRESETS]).toEqual([
      'left top', 'center top', 'right top',
      'left center', 'center center', 'right center',
      'left bottom', 'center bottom', 'right bottom',
    ]);
  });
});

describe('isBannerObjectPosition', () => {
  it('accepts every legacy preset so old profile rows can hydrate', () => {
    for (const preset of BANNER_OBJECT_POSITION_PRESETS) {
      expect(isBannerObjectPosition(preset)).toBe(true);
    }
  });

  it('accepts bounded percentage crop coordinates for manual dragging', () => {
    expect(isBannerObjectPosition('50% 50%')).toBe(true);
    expect(isBannerObjectPosition('0% 100%')).toBe(true);
    expect(isBannerObjectPosition('33.25% 71.5%')).toBe(true);
  });

  it('rejects values outside the safe percentage coordinate contract', () => {
    expect(isBannerObjectPosition('Center Center')).toBe(false);
    expect(isBannerObjectPosition('center  center')).toBe(false);
    expect(isBannerObjectPosition('top')).toBe(false);
    expect(isBannerObjectPosition('center top center')).toBe(false);
    expect(isBannerObjectPosition('-1% 50%')).toBe(false);
    expect(isBannerObjectPosition('50% 101%')).toBe(false);
  });

  it('rejects CSS-injection-shaped strings', () => {
    expect(isBannerObjectPosition('center center; background: url(evil)')).toBe(false);
    expect(isBannerObjectPosition('100px 200px')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isBannerObjectPosition(null)).toBe(false);
    expect(isBannerObjectPosition(undefined)).toBe(false);
    expect(isBannerObjectPosition(0)).toBe(false);
    expect(isBannerObjectPosition(['center center'])).toBe(false);
    expect(isBannerObjectPosition({ value: 'center center' })).toBe(false);
  });
});

describe('normalizeBannerObjectPosition', () => {
  it('maps legacy presets to percentage coordinates', () => {
    expect(normalizeBannerObjectPosition('left top')).toBe('0% 0%');
    expect(normalizeBannerObjectPosition('center center')).toBe(DEFAULT_BANNER_OBJECT_POSITION);
    expect(normalizeBannerObjectPosition('right bottom')).toBe('100% 100%');
  });

  it('clamps malformed saved percentages back into the visible crop area', () => {
    expect(normalizeBannerObjectPosition('-10% 125%')).toBe('0% 100%');
    expect(normalizeBannerObjectPosition('33.333% 66.666%')).toBe('33.33% 66.67%');
  });
});

describe('normalizeBannerImageScale', () => {
  it('keeps cover zoom in a bounded range', () => {
    expect(normalizeBannerImageScale(0.1)).toBe(0.5);
    expect(normalizeBannerImageScale(1.25)).toBe(1.25);
    expect(normalizeBannerImageScale(9)).toBe(3);
  });
});

describe('normalizeBannerFrameHeight', () => {
  it('keeps the cover frame height in a usable banner range', () => {
    expect(normalizeBannerFrameHeight(120)).toBe(180);
    expect(normalizeBannerFrameHeight(460)).toBe(460);
    expect(normalizeBannerFrameHeight(1200)).toBe(1000);
  });
});

describe('normalizeBannerCollagePhotos', () => {
  it('keeps only safe uploaded media URLs and caps the collage size', () => {
    expect(normalizeBannerCollagePhotos([
      '/uploads/one.jpg',
      ' javascript:alert(1)',
      '/uploads/two.jpg',
      '/uploads/three.jpg',
      '/uploads/four.jpg',
      '/uploads/five.jpg',
      '/uploads/six.jpg',
      '/uploads/seven.jpg',
      '/uploads/eight.jpg',
      '/uploads/nine.jpg',
      '/uploads/ten.jpg',
      '/uploads/eleven.jpg',
      '/uploads/twelve.jpg',
      '/uploads/thirteen.jpg',
    ])).toEqual([
      '/uploads/one.jpg',
      '/uploads/two.jpg',
      '/uploads/three.jpg',
      '/uploads/four.jpg',
      '/uploads/five.jpg',
      '/uploads/six.jpg',
      '/uploads/seven.jpg',
      '/uploads/eight.jpg',
      '/uploads/nine.jpg',
      '/uploads/ten.jpg',
      '/uploads/eleven.jpg',
      '/uploads/twelve.jpg',
    ]);
  });

  it('caps video media while preserving photo slots', () => {
    expect(normalizeBannerCollagePhotos([
      '/uploads/one.mp4',
      '/uploads/two.webm',
      '/uploads/three.mov',
      '/uploads/four.mp4',
      '/uploads/photo.jpg',
    ])).toEqual([
      '/uploads/one.mp4',
      '/uploads/two.webm',
      '/uploads/three.mov',
      '/uploads/photo.jpg',
    ]);
  });
});
