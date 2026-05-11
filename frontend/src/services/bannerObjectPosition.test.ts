/**
 * bannerObjectPosition — enum-guard regression tests
 * ===================================================
 * 2026-05-10 SLICE 2: locks the 9-preset whitelist contract on the
 * frontend boundary. The same whitelist must also exist on the backend
 * route (profileController.mjs) and as a Postgres ENUM column. Anyone
 * editing the preset list in one place must update all three.
 */
import { describe, it, expect } from 'vitest';
import {
  BANNER_OBJECT_POSITION_PRESETS,
  isBannerObjectPosition,
} from './profileService';

describe('BANNER_OBJECT_POSITION_PRESETS', () => {
  it('contains exactly 9 entries (3×3 grid)', () => {
    expect(BANNER_OBJECT_POSITION_PRESETS).toHaveLength(9);
  });

  it('matches the documented presets in row-major order', () => {
    expect([...BANNER_OBJECT_POSITION_PRESETS]).toEqual([
      'left top', 'center top', 'right top',
      'left center', 'center center', 'right center',
      'left bottom', 'center bottom', 'right bottom',
    ]);
  });

  it("includes 'center center' as the default-safe value", () => {
    expect(BANNER_OBJECT_POSITION_PRESETS).toContain('center center');
  });
});

describe('isBannerObjectPosition', () => {
  it('accepts every preset in the whitelist', () => {
    for (const preset of BANNER_OBJECT_POSITION_PRESETS) {
      expect(isBannerObjectPosition(preset)).toBe(true);
    }
  });

  it('rejects values outside the whitelist (case + spacing variations)', () => {
    expect(isBannerObjectPosition('Center Center')).toBe(false);
    expect(isBannerObjectPosition('center  center')).toBe(false);
    expect(isBannerObjectPosition('top')).toBe(false);
    expect(isBannerObjectPosition('center top center')).toBe(false);
  });

  it('rejects CSS-injection-shaped strings', () => {
    expect(isBannerObjectPosition('center center; background: url(evil)')).toBe(false);
    expect(isBannerObjectPosition('50% 50%')).toBe(false);
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
