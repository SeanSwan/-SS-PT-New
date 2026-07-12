import {
  CORE_RENDERER_ALLOWLIST,
  MANIFEST_SCHEMA_VERSION,
  PROFILE_SCHEMA_VERSION,
} from './constants';
import {
  LAYOUT_PROFILE_IDS,
  STYLE_LENS_SLOTS,
  type AppearanceProfile,
  type RendererAllowlist,
  type StyleLensManifest,
  type StyleLensRegistry,
  type ValidationResult,
} from './types';

const hasExactMembers = (
  actual: readonly string[],
  expected: readonly string[],
): boolean =>
  actual.length === expected.length &&
  expected.every((value) => actual.includes(value));

const isNonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const validateStyleLensManifest = (
  manifest: StyleLensManifest,
  allowlist: RendererAllowlist = CORE_RENDERER_ALLOWLIST,
): ValidationResult => {
  const issues: string[] = [];

  if (manifest.manifestSchemaVersion !== MANIFEST_SCHEMA_VERSION) {
    issues.push('manifestSchemaVersion is unsupported');
  }
  ['id', 'version', 'name', 'description', 'layoutSignature'].forEach((key) => {
    if (!isNonEmpty(manifest[key as keyof StyleLensManifest])) {
      issues.push(`${key} is required`);
    }
  });
  if (!allowlist.shell.includes(manifest.shellRenderer)) {
    issues.push('shellRenderer is not allowlisted');
  }
  if (!allowlist.navigation.includes(manifest.navigationRenderer)) {
    issues.push('navigationRenderer is not allowlisted');
  }

  const recipeKeys = Object.keys(manifest.componentRecipes);
  if (!hasExactMembers(recipeKeys, STYLE_LENS_SLOTS)) {
    issues.push('componentRecipes must define exactly the eleven slots');
  }
  STYLE_LENS_SLOTS.forEach((slot) => {
    if (!allowlist.recipes.includes(manifest.componentRecipes[slot])) {
      issues.push(`component recipe for ${slot} is not allowlisted`);
    }
  });

  const profileKeys = Object.keys(manifest.layoutProfiles);
  if (!hasExactMembers(profileKeys, LAYOUT_PROFILE_IDS)) {
    issues.push('layoutProfiles must define exactly three profiles');
  }
  LAYOUT_PROFILE_IDS.forEach((id) => {
    const profile = manifest.layoutProfiles[id];
    if (!profile || profile.id !== id) {
      issues.push(`layout profile ${id} is invalid`);
      return;
    }
    if (!hasExactMembers(profile.slotOrder, STYLE_LENS_SLOTS)) {
      issues.push(`layout profile ${id} must contain every slot once`);
    }
  });

  if (manifest.accessibilityReceipt.minimumTextContrast < 4.5) {
    issues.push('minimum text contrast must be at least 4.5');
  }
  if (!manifest.accessibilityReceipt.supportsReducedMotion) {
    issues.push('reduced motion support is required');
  }
  if (manifest.accessibilityReceipt.minimumTouchTargetPx < 44) {
    issues.push('minimum touch target must be at least 44px');
  }

  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
};

export const validateAppearanceProfile = (
  profile: AppearanceProfile,
  registry: StyleLensRegistry,
): ValidationResult => {
  const issues: string[] = [];
  if (profile.profileSchemaVersion !== PROFILE_SCHEMA_VERSION) {
    issues.push('profileSchemaVersion is unsupported');
  }
  if (!isNonEmpty(profile.paletteThemeId)) issues.push('paletteThemeId is required');
  if (registry.resolve(profile.styleLensId).id !== profile.styleLensId) {
    issues.push('styleLensId is unavailable');
  }
  if (!['auto', 'reduced', 'off'].includes(profile.motionMode)) {
    issues.push('motionMode is invalid');
  }
  if (!['comfortable', 'compact'].includes(profile.density)) {
    issues.push('density is invalid');
  }
  if (Number.isNaN(Date.parse(profile.updatedAt))) {
    issues.push('updatedAt is invalid');
  }
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
};
