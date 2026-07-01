import { describe, expect, it } from 'vitest';
import { getCompanionRenderTier } from './companionRenderTier';

describe('companionRenderTier', () => {
  it('uses lite mode for motion and data saver constraints', () => {
    expect(getCompanionRenderTier({ reducedMotion: true, deviceMemoryGb: 16, cpuCores: 16 })).toBe('lite');
    expect(getCompanionRenderTier({ saveData: true, deviceMemoryGb: 16, cpuCores: 16 })).toBe('lite');
  });

  it('keeps constrained devices on sprite mode', () => {
    expect(getCompanionRenderTier({ deviceMemoryGb: 2, cpuCores: 8, viewportWidth: 1200 })).toBe('sprite');
    expect(getCompanionRenderTier({ deviceMemoryGb: 8, cpuCores: 2, viewportWidth: 1200 })).toBe('sprite');
    expect(getCompanionRenderTier({ deviceMemoryGb: 8, cpuCores: 8, viewportWidth: 390 })).toBe('sprite');
  });

  it('selects richer tiers only when capability supports them', () => {
    expect(getCompanionRenderTier({ deviceMemoryGb: 4, cpuCores: 4, viewportWidth: 900 })).toBe('voxel');
    expect(getCompanionRenderTier({ deviceMemoryGb: 16, cpuCores: 16, viewportWidth: 1440, prefersPremium: true })).toBe('three');
  });
});
