import { describe, expect, it } from 'vitest';
import {
  SWAN_EXPANSION_MANIFESTS,
  SWAN_FLAGSHIP_MANIFEST,
  SWAN_ROLE_SLOT_MAP,
  SWAN_SENTINEL_MANIFESTS,
  SWAN_STYLE_LENS_REGISTRY,
  SWAN_STYLE_LENS_VISUALS,
} from './index';

const expectedSentinels = [
  ['quiet-meridian', 'Quiet Meridian'],
  ['blueprint-fold', 'Blueprint Fold'],
  ['kintsugi-circuit', 'Kintsugi Circuit'],
  ['analog-flight-recorder', 'Analog Flight Recorder'],
  ['candy-glass-arcade', 'Candy Glass Arcade'],
];

const expectedExpansion = [
  ['recovery-cloister', 'Recovery Cloister'],
  ['tempo-forge', 'Tempo Forge'],
  ['coach-ledger', 'Coach Ledger'],
  ['signal-garden', 'Signal Garden'],
  ['split-horizon', 'Split Horizon'],
  ['prism-terminal', 'Prism Terminal'],
  ['tidal-columns', 'Tidal Columns'],
  ['monastic-grid', 'Monastic Grid'],
  ['orbit-atlas', 'Orbit Atlas'],
  ['carbon-atelier', 'Carbon Atelier'],
  ['kinetic-kanban', 'Kinetic Kanban'],
  ['aurora-index', 'Aurora Index'],
  ['modular-harbor', 'Modular Harbor'],
  ['terrain-console', 'Terrain Console'],
  ['chronograph-board', 'Chronograph Board'],
  ['glass-rail', 'Glass Rail'],
  ['meridian-magazine', 'Meridian Magazine'],
  ['lunar-stack', 'Lunar Stack'],
  ['cedar-workshop', 'Cedar Workshop'],
  ['crystalline-cathedral', 'Crystalline Cathedral'],
];

const luminance = (hex: string) => {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrast = (foreground: string, background: string) => {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

describe('Swan Style Lens adapter', () => {
  it('publishes exactly the five Fable sentinel manifests', () => {
    expect(
      SWAN_SENTINEL_MANIFESTS.map(({ id, name }) => [id, name]),
    ).toEqual(expectedSentinels);
    expect(new Set(
      SWAN_SENTINEL_MANIFESTS.map(({ layoutSignature }) => layoutSignature),
    ).size).toBe(5);
    expect(new Set(
      SWAN_SENTINEL_MANIFESTS.map(({ navigationRenderer }) => navigationRenderer),
    ).size).toBe(5);
  });

  it('keeps Default and Swan flagship separate from the sentinel gate', () => {
    expect(SWAN_FLAGSHIP_MANIFEST.id).toBe('swan-flagship');
    // A4 count-law: derived from the enumerations (+2 = default-safety + swan-flagship).
    expect(SWAN_STYLE_LENS_REGISTRY.available()).toHaveLength(
      expectedSentinels.length + expectedExpansion.length + 2,
    );
    expect(SWAN_STYLE_LENS_REGISTRY.resolve('not-a-lens').id).toBe(
      'default-safety',
    );
  });

  it('publishes expansion batches 6-25 with pairwise structural differentiation', () => {
    expect(SWAN_EXPANSION_MANIFESTS.map(({ id, name }) => [id, name])).toEqual(expectedExpansion);
    const promoted = [...SWAN_SENTINEL_MANIFESTS, ...SWAN_EXPANSION_MANIFESTS];
    const dimensions = ['layoutSignature', 'navigationRenderer', 'shellRenderer'] as const;
    promoted.forEach((lens, index) => promoted.slice(index + 1).forEach((peer) => {
      expect(dimensions.filter((key) => lens[key] !== peer[key]).length).toBeGreaterThanOrEqual(2);
    }));
  });

  it('keeps retired Galaxy-Swan colors out of adapter runtime source', () => {
    const runtimeSource = JSON.stringify({
      manifests: SWAN_STYLE_LENS_REGISTRY.available(),
      visuals: SWAN_STYLE_LENS_VISUALS,
    }).toLowerCase();
    ['#0a0a1a', '#00ffff', '#7851a9'].forEach((retired) => {
      expect(runtimeSource).not.toContain(retired);
    });
  });
  it.each([...SWAN_SENTINEL_MANIFESTS, ...SWAN_EXPANSION_MANIFESTS])(
    '$name carries accessibility, motion, and one-hop fallback receipts',
    (manifest) => {
      expect(manifest.promotion.status).toBe('approved');
      expect(manifest.fallbackLensId).toBe('default-safety');
      expect(manifest.accessibilityReceipt.minimumTextContrast).toBeGreaterThanOrEqual(4.5);
      expect(manifest.accessibilityReceipt.minimumTouchTargetPx).toBeGreaterThanOrEqual(44);
      expect(manifest.accessibilityReceipt.supportsReducedMotion).toBe(true);
      expect(manifest.motionBudget.mobileMs).toBeLessThanOrEqual(180);
      expect(Object.keys(manifest.layoutProfiles)).toHaveLength(3);
      expect(Object.keys(manifest.componentRecipes)).toHaveLength(11);
    },
  );

  it('defines distinct static visual receipts without remote assets', () => {
    expect(Object.keys(SWAN_STYLE_LENS_VISUALS)).toEqual(
      [...expectedSentinels, ...expectedExpansion].map(([id]) => id),
    );
    expect(new Set(
      Object.values(SWAN_STYLE_LENS_VISUALS).map(({ signatureMoment }) => signatureMoment),
    ).size).toBe(expectedSentinels.length + expectedExpansion.length);
    Object.values(SWAN_STYLE_LENS_VISUALS).forEach((visual) => {
      expect(visual.assetTier).toBe('static-css');
      expect(visual.primaryActionMinHeight).toBeGreaterThanOrEqual(44);
      expect(
        contrast(visual.foregroundFallback, visual.backgroundFallback),
      ).toBeCloseTo(visual.textContrast, 1);
      expect(visual.foregroundToken).toBe('frost-white');
      expect(visual.blueButtonGlowToken).toBe('wing-purple');
      expect(visual.purpleButtonGlowToken).toBe('ice-wing');
      if (visual.accentFallback && visual.accentBackgroundFallback) {
        expect(
          contrast(visual.accentFallback, visual.accentBackgroundFallback),
        ).toBeCloseTo(visual.accentContrast ?? 0, 1);
        expect(visual.accentContrast).toBeGreaterThanOrEqual(4.5);
        expect(visual.accentUsage).toBe('decorative');
      }
      expect(visual.textContrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('maps every role to the same semantic slots without owning destinations', () => {
    expect(Object.keys(SWAN_ROLE_SLOT_MAP)).toEqual([
      'user',
      'client',
      'trainer',
      'admin',
    ]);
    Object.values(SWAN_ROLE_SLOT_MAP).forEach((mapping) => {
      expect(mapping.navigation).toBe('preserve-mounted-routes');
      expect(mapping.primaryAction).toBe('next-action');
      expect(mapping.routeOverrides).toEqual([]);
    });
  });
});
