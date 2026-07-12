import { describe, expect, it } from 'vitest';
import {
  CORE_RENDERER_ALLOWLIST,
  DEFAULT_STYLE_LENS_ID,
  LAYOUT_PROFILE_IDS,
  STYLE_LENS_SLOTS,
  createStyleLensRegistry,
  type StyleLensManifest,
} from '.';

const makeManifest = (
  id: string,
  overrides: Partial<StyleLensManifest> = {},
): StyleLensManifest => ({
  manifestSchemaVersion: 1,
  id,
  version: '1.0.0',
  name: id,
  description: `${id} description`,
  emotionalJob: 'clarity',
  layoutSignature: `${id}-layout`,
  navigationRenderer: 'default-navigation',
  shellRenderer: 'default-shell',
  componentRecipes: Object.fromEntries(
    STYLE_LENS_SLOTS.map((slot) => [slot, 'default-recipe']),
  ) as StyleLensManifest['componentRecipes'],
  layoutProfiles: Object.fromEntries(
    LAYOUT_PROFILE_IDS.map((profile) => [
      profile,
      { id: profile, slotOrder: [...STYLE_LENS_SLOTS] },
    ]),
  ) as StyleLensManifest['layoutProfiles'],
  palettePolicy: { mode: 'inherit-any' },
  motionBudget: {
    mobileMs: 180,
    tabletMs: 240,
    desktopMs: 320,
    ambient: false,
  },
  assetManifest: [],
  accessibilityReceipt: {
    minimumTextContrast: 4.5,
    supportsReducedMotion: true,
    minimumTouchTargetPx: 44,
  },
  promotion: { status: 'approved', reviewedBy: 'system' },
  fallbackLensId: DEFAULT_STYLE_LENS_ID,
  ...overrides,
});

describe('Style Lens OS registry', () => {
  it('freezes the eleven semantic slots and three layout profiles', () => {
    expect(STYLE_LENS_SLOTS).toEqual([
      'shell',
      'navigation',
      'orientation',
      'context-bar',
      'current-state',
      'insight',
      'progress-proof',
      'next-action',
      'secondary-rail',
      'action-dock',
      'overlay-root',
    ]);
    expect(LAYOUT_PROFILE_IDS).toEqual([
      'mobile-minimal',
      'tablet',
      'desktop-enhanced',
    ]);
  });

  it('resolves valid approved lenses without exposing mutable registry state', () => {
    const safety = makeManifest(DEFAULT_STYLE_LENS_ID, {
      fallbackLensId: DEFAULT_STYLE_LENS_ID,
    });
    const quiet = makeManifest('quiet-meridian');
    const registry = createStyleLensRegistry([safety, quiet]);

    expect(registry.get('quiet-meridian')?.name).toBe('quiet-meridian');
    expect(registry.available().map(({ id }) => id)).toEqual([
      DEFAULT_STYLE_LENS_ID,
      'quiet-meridian',
    ]);
    expect(() => registry.available().push(quiet)).toThrow();
  });

  it('fails unknown, malformed, unpromoted, and non-one-hop fallbacks closed to Default', () => {
    const safety = makeManifest(DEFAULT_STYLE_LENS_ID, {
      fallbackLensId: DEFAULT_STYLE_LENS_ID,
    });
    const experimental = makeManifest('experimental', {
      promotion: { status: 'experimental' },
    });
    const chained = makeManifest('chained', { fallbackLensId: 'experimental' });
    const invalidRenderer = makeManifest('invalid-renderer', {
      shellRenderer: 'remote-component' as StyleLensManifest['shellRenderer'],
    });
    const registry = createStyleLensRegistry([
      safety,
      experimental,
      chained,
      invalidRenderer,
    ]);

    expect(registry.resolve('missing').id).toBe(DEFAULT_STYLE_LENS_ID);
    expect(registry.resolve('experimental').id).toBe(DEFAULT_STYLE_LENS_ID);
    expect(registry.resolve('chained').id).toBe(DEFAULT_STYLE_LENS_ID);
    expect(registry.resolve('invalid-renderer').id).toBe(DEFAULT_STYLE_LENS_ID);
    expect(registry.issues('invalid-renderer')).toContain(
      'shellRenderer is not allowlisted',
    );
    expect(CORE_RENDERER_ALLOWLIST.shell).toContain('default-shell');
  });

  it('rejects a Default lens that does not self-fallback', () => {
    const unsafeDefault = makeManifest(DEFAULT_STYLE_LENS_ID, {
      fallbackLensId: 'quiet-meridian',
    });

    expect(() => createStyleLensRegistry([unsafeDefault])).toThrow(
      /Default safety lens must fall back to itself/,
    );
  });
});
