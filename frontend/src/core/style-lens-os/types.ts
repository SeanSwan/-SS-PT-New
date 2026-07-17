/**
 * Brand-neutral contracts for structural application appearance.
 * This module intentionally contains no product, route, or brand dependencies.
 */

export const STYLE_LENS_SLOTS = [
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
] as const;

export const LAYOUT_PROFILE_IDS = [
  'mobile-minimal',
  'tablet',
  'desktop-enhanced',
] as const;

export type StyleLensSlot = (typeof STYLE_LENS_SLOTS)[number];
export type LayoutProfileId = (typeof LAYOUT_PROFILE_IDS)[number];
export type MotionMode = 'auto' | 'reduced' | 'off';
export type AppearanceDensity = 'comfortable' | 'compact';
export type PalettePolicy =
  | { mode: 'inherit-any' }
  | { mode: 'curated'; paletteIds: readonly string[] }
  | { mode: 'signature'; paletteId: string };

export type ShellRendererId =
  | 'default-shell'
  | 'flagship-shell'
  | 'calm-column-shell'
  | 'folded-grid-shell'
  | 'fracture-shell'
  | 'instrument-shell'
  | 'arcade-shell'
  | 'recovery-cloister-shell'
  | 'tempo-forge-shell'
  | 'coach-ledger-shell'
  | 'signal-garden-shell'
  | 'split-horizon-shell'
  | 'prism-terminal-shell'
  | 'tidal-columns-shell'
  | 'monastic-grid-shell'
  | 'orbit-atlas-shell'
  | 'carbon-atelier-shell'
  | 'kinetic-kanban-shell'
  | 'aurora-index-shell'
  | 'aurora-console-shell'
  | 'modular-harbor-shell'
  | 'terrain-console-shell'
  | 'chronograph-board-shell'
  | 'glass-rail-shell'
  | 'meridian-magazine-shell'
  | 'lunar-stack-shell'
  | 'cedar-workshop-shell'
  | 'crystalline-cathedral-shell';
export type NavigationRendererId =
  | 'default-navigation'
  | 'flagship-navigation'
  | 'quiet-rail-navigation'
  | 'blueprint-tabs-navigation'
  | 'circuit-orbit-navigation'
  | 'instrument-strip-navigation'
  | 'arcade-dock-navigation'
  | 'cloister-bottom-navigation'
  | 'tempo-strip-navigation'
  | 'ledger-index-navigation'
  | 'garden-branch-navigation'
  | 'horizon-dock-navigation'
  | 'prism-command-navigation'
  | 'tidal-ribbon-navigation'
  | 'monastic-index-navigation'
  | 'orbital-map-navigation'
  | 'atelier-toolrail-navigation'
  | 'swimlane-pulse-navigation'
  | 'aurora-index-navigation'
  | 'aurora-console-navigation'
  | 'harbor-berth-navigation'
  | 'contour-map-navigation'
  | 'chrono-dial-navigation'
  | 'glass-spine-navigation'
  | 'magazine-folio-navigation'
  | 'lunar-beacon-navigation'
  | 'workshop-parts-navigation'
  | 'cathedral-apse-navigation';
export type ComponentRecipeId =
  | 'default-recipe'
  | 'flagship-recipe'
  | 'quiet-recipe'
  | 'blueprint-recipe'
  | 'kintsugi-recipe'
  | 'instrument-recipe'
  | 'arcade-recipe'
  | 'recovery-cloister-recipe'
  | 'tempo-forge-recipe'
  | 'coach-ledger-recipe'
  | 'signal-garden-recipe'
  | 'split-horizon-recipe'
  | 'prism-terminal-recipe'
  | 'tidal-columns-recipe'
  | 'monastic-grid-recipe'
  | 'orbit-atlas-recipe'
  | 'carbon-atelier-recipe'
  | 'kinetic-kanban-recipe'
  | 'aurora-index-recipe'
  | 'aurora-console-recipe'
  | 'modular-harbor-recipe'
  | 'terrain-console-recipe'
  | 'chronograph-board-recipe'
  | 'glass-rail-recipe'
  | 'meridian-magazine-recipe'
  | 'lunar-stack-recipe'
  | 'cedar-workshop-recipe'
  | 'crystalline-cathedral-recipe';

export interface RendererAllowlist {
  shell: readonly string[];
  navigation: readonly string[];
  recipes: readonly string[];
}

export interface AppearanceProfile {
  profileSchemaVersion: number;
  paletteThemeId: string;
  styleLensId: string;
  motionMode: MotionMode;
  density: AppearanceDensity;
  updatedAt: string;
}

export interface StyleLensProfile {
  id: LayoutProfileId;
  slotOrder: readonly StyleLensSlot[];
}

export interface MotionBudget {
  mobileMs: number;
  tabletMs: number;
  desktopMs: number;
  ambient: boolean;
}

export interface AssetReceipt {
  id: string;
  kind: 'static' | 'local-motion' | 'generated-motion';
  fallbackId?: string;
}

export interface AccessibilityReceipt {
  minimumTextContrast: number;
  supportsReducedMotion: boolean;
  minimumTouchTargetPx: number;
}

export interface PromotionReceipt {
  status: 'approved' | 'experimental' | 'rejected';
  reviewedBy?: string;
}

export interface StyleLensManifest {
  manifestSchemaVersion: number;
  id: string;
  version: string;
  name: string;
  description: string;
  emotionalJob: string;
  layoutSignature: string;
  navigationRenderer: NavigationRendererId;
  shellRenderer: ShellRendererId;
  componentRecipes: Record<StyleLensSlot, ComponentRecipeId>;
  layoutProfiles: Record<LayoutProfileId, StyleLensProfile>;
  palettePolicy: PalettePolicy;
  motionBudget: MotionBudget;
  assetManifest: readonly AssetReceipt[];
  accessibilityReceipt: AccessibilityReceipt;
  promotion: PromotionReceipt;
  fallbackLensId: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: readonly string[];
}

export interface StyleLensRegistry {
  get: (id: string) => StyleLensManifest | undefined;
  resolve: (id: string) => StyleLensManifest;
  available: () => StyleLensManifest[];
  issues: (id: string) => readonly string[];
}
