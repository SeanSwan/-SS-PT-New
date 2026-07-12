import { describe, expect, it } from 'vitest';
import {
  validateSurfaceCapabilityManifest,
  type SurfaceCapabilityManifest,
} from './capability-manifest.schema';

const soundManifest = (): SurfaceCapabilityManifest => ({
  surfaceId: 'log-workout',
  hostId: 'workout-logger',
  version: '1.0.0',
  profiles: ['mobile-minimal', 'tablet', 'desktop-enhanced'],
  slots: {
    'surface.card': { required: true, supportedVariants: ['floating-candy'] },
    'action.primary': { required: true, supportedVariants: ['glass-dock'] },
  },
  templates: { 'playfield-stack': { supportedProfiles: ['mobile-minimal'] } },
});

describe('SurfaceCapabilityManifest validation (fail-closed)', () => {
  it('accepts a sound manifest', () => {
    expect(validateSurfaceCapabilityManifest(soundManifest())).toEqual([]);
  });

  it('rejects free-form version strings', () => {
    const manifest = { ...soundManifest(), version: 'latest-and-greatest' };
    expect(validateSurfaceCapabilityManifest(manifest).map(i => i.path)).toContain('version');
  });

  it('rejects a forbidden layout field', () => {
    const manifest = { ...soundManifest(), layout: 'two-column' } as SurfaceCapabilityManifest;
    expect(validateSurfaceCapabilityManifest(manifest).map(i => i.path)).toContain('layout');
  });

  it('rejects raw color values smuggled into variant names', () => {
    const manifest = soundManifest();
    manifest.slots['surface.card'] = { required: true, supportedVariants: ['#ff00aa'] };
    const issues = validateSurfaceCapabilityManifest(manifest);
    expect(issues.some(i => i.path === 'slots.surface.card' && /raw color/.test(i.message))).toBe(true);
  });

  it('rejects non-kebab surface ids and empty profile lists', () => {
    const badId = { ...soundManifest(), surfaceId: 'LogWorkout' };
    expect(validateSurfaceCapabilityManifest(badId).map(i => i.path)).toContain('surfaceId');

    const noProfiles = { ...soundManifest(), profiles: [] as never[] };
    expect(validateSurfaceCapabilityManifest(noProfiles).map(i => i.path)).toContain('profiles');
  });
});
