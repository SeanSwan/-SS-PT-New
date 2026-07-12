/**
 * Swan adapter manifest factory.
 * Product-specific decisions stay outside the extractable Style Lens core.
 */
import {
  DEFAULT_STYLE_LENS_ID,
  MANIFEST_SCHEMA_VERSION,
  STYLE_LENS_SLOTS,
  type ComponentRecipeId,
  type NavigationRendererId,
  type ShellRendererId,
  type StyleLensManifest,
  type StyleLensSlot,
} from '../../core/style-lens-os';

const recipes = (
  recipe: ComponentRecipeId,
): StyleLensManifest['componentRecipes'] =>
  Object.fromEntries(
    STYLE_LENS_SLOTS.map((slot) => [slot, recipe]),
  ) as StyleLensManifest['componentRecipes'];

const rotate = (
  slots: readonly StyleLensSlot[],
  offset: number,
): StyleLensSlot[] => [
  ...slots.slice(offset),
  ...slots.slice(0, offset),
];

interface SwanManifestInput {
  id: string;
  name: string;
  description: string;
  emotionalJob: string;
  layoutSignature: string;
  navigationRenderer: NavigationRendererId;
  shellRenderer: ShellRendererId;
  recipe: ComponentRecipeId;
  profileOffsets: readonly [number, number, number];
  ambient?: boolean;
}

export const createSwanManifest = ({
  id,
  name,
  description,
  emotionalJob,
  layoutSignature,
  navigationRenderer,
  shellRenderer,
  recipe,
  profileOffsets,
  ambient = false,
}: SwanManifestInput): StyleLensManifest => ({
  manifestSchemaVersion: MANIFEST_SCHEMA_VERSION,
  id,
  version: '1.0.0',
  name,
  description,
  emotionalJob,
  layoutSignature,
  navigationRenderer,
  shellRenderer,
  componentRecipes: recipes(recipe),
  layoutProfiles: {
    'mobile-minimal': {
      id: 'mobile-minimal',
      slotOrder: rotate(STYLE_LENS_SLOTS, profileOffsets[0]),
    },
    tablet: {
      id: 'tablet',
      slotOrder: rotate(STYLE_LENS_SLOTS, profileOffsets[1]),
    },
    'desktop-enhanced': {
      id: 'desktop-enhanced',
      slotOrder: rotate(STYLE_LENS_SLOTS, profileOffsets[2]),
    },
  },
  palettePolicy: { mode: 'inherit-any' },
  motionBudget: {
    mobileMs: 180,
    tabletMs: 280,
    desktopMs: 360,
    ambient,
  },
  assetManifest: [],
  accessibilityReceipt: {
    minimumTextContrast: 4.5,
    supportsReducedMotion: true,
    minimumTouchTargetPx: 44,
  },
  promotion: {
    status: 'approved',
    reviewedBy: 'fable-sentinel-contract',
  },
  fallbackLensId: DEFAULT_STYLE_LENS_ID,
});
