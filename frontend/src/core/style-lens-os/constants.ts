import type {
  AppearanceProfile,
  RendererAllowlist,
} from './types';

export const MANIFEST_SCHEMA_VERSION = 1;
export const PROFILE_SCHEMA_VERSION = 1;
export const DEFAULT_STYLE_LENS_ID = 'default-safety';
export const DEFAULT_PALETTE_THEME_ID = 'crystalline-dark';

export const CORE_RENDERER_ALLOWLIST: RendererAllowlist = Object.freeze({
  shell: Object.freeze(['default-shell']),
  navigation: Object.freeze(['default-navigation']),
  recipes: Object.freeze(['default-recipe']),
});

export const DEFAULT_APPEARANCE_PROFILE: AppearanceProfile = Object.freeze({
  profileSchemaVersion: PROFILE_SCHEMA_VERSION,
  paletteThemeId: DEFAULT_PALETTE_THEME_ID,
  styleLensId: DEFAULT_STYLE_LENS_ID,
  motionMode: 'auto',
  density: 'comfortable',
  updatedAt: '1970-01-01T00:00:00.000Z',
});
