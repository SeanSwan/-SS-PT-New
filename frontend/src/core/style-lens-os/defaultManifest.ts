import {
  DEFAULT_STYLE_LENS_ID,
  MANIFEST_SCHEMA_VERSION,
} from './constants';
import {
  LAYOUT_PROFILE_IDS,
  STYLE_LENS_SLOTS,
  type StyleLensManifest,
} from './types';

const componentRecipes = Object.fromEntries(
  STYLE_LENS_SLOTS.map((slot) => [slot, 'default-recipe']),
) as StyleLensManifest['componentRecipes'];

const layoutProfiles = Object.fromEntries(
  LAYOUT_PROFILE_IDS.map((id) => [
    id,
    { id, slotOrder: [...STYLE_LENS_SLOTS] },
  ]),
) as unknown as StyleLensManifest['layoutProfiles'];

export const DEFAULT_STYLE_LENS_MANIFEST: StyleLensManifest = {
  manifestSchemaVersion: MANIFEST_SCHEMA_VERSION,
  id: DEFAULT_STYLE_LENS_ID,
  version: '1.0.0',
  name: 'Default',
  description: 'Stable, brand-neutral application composition.',
  emotionalJob: 'clarity',
  layoutSignature: 'default-semantic-flow',
  navigationRenderer: 'default-navigation',
  shellRenderer: 'default-shell',
  componentRecipes,
  layoutProfiles,
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
  promotion: {
    status: 'approved',
    reviewedBy: 'core-contract',
  },
  fallbackLensId: DEFAULT_STYLE_LENS_ID,
};
