/**
 * GENERATED FILE — DO NOT EDIT (drift-checked by `npm run gate` in packages/swan-forge).
 * Source of truth: packages/swan-forge/tokens/packs/crystalline-swan.css
 * Regenerate: node packages/swan-forge/scripts/generate-sc-theme.mjs
 * Check:      node packages/swan-forge/scripts/generate-sc-theme.mjs --check
 */
export const forgeTheme = {
  bgBase: "#0A0A0F", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  bgSurface: "#141419", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  bgElevated: "#1A1A24", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  bgOverlay: "rgba(3, 7, 18, 0.72)",
  textPrimary: "#E0ECF4", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  textSecondary: "#A8BDD0", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  textMuted: "#7E93A8", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  textInverse: "#FFFFFF", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  colorPrimary: "#002060", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  colorAccent: "#8B5CF6", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  colorGold: "#C6A84B", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  colorSuccess: "#22C55E", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  colorDanger: "#EF4444", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  colorWarning: "#D97706", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  border: "rgba(96, 192, 240, 0.16)",
  borderStrong: "rgba(224, 236, 244, 0.28)",
  glowA: "#8B5CF6", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  glowB: "#60C0F0", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  focusRing: "#8B5CF6", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  fontHeading: "\"Plus Jakarta Sans\", system-ui, sans-serif",
  fontBody: "\"Plus Jakarta Sans\", system-ui, sans-serif",
  fontData: "\"Fira Code\", ui-monospace, monospace",
  fontUi: "\"Sora\", system-ui, sans-serif",
  textScale: "1",
  shadow1: "0 1px 2px rgba(0, 0, 0, 0.4)",
  shadow2: "0 6px 18px rgba(0, 8, 32, 0.45)",
  shadow3: "0 16px 48px rgba(0, 8, 32, 0.6)",
  motion: "1",
  assetHeroVideo: "none",
  assetBrandMark: "none",
  btnPrimaryText: "#E0ECF4", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnAccentGlowB: "#50A0F0", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnGildedBg: "#1A1505", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnGildedGlowA: "#C6A84B", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnGildedGlowB: "#DAC36E", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnSuccessBg: "#0A1E10", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnSuccessGlowA: "#22C55E", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnSuccessGlowB: "#4ADE80", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnDangerBg: "#1E0A0A", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnDangerGlowA: "#EF4444", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnDangerGlowB: "#FC8181", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnGhostGlowA: "#4070C0", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnGhostGlowB: "#60C0F0", // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)
  btnHeight: "48px",
  btnRadius: "12px",
  btnHeightSm: "44px",
  btnRadiusSm: "10px",
  btnHeightLg: "56px",
  btnRadiusLg: "14px",
  btnWeight: "500",
  btnTracking: "0.5px",
} as const;

/**
 * Composite tokens (their values reference other custom properties) — resolvable ONLY
 * in the cascade, so consumers read them via getComputedStyle(el).getPropertyValue(name).
 * Listed by NAME so nothing is silently dropped from the projection.
 */
export const forgeThemeComposites = {
  focusShadow: "--sw-focus-shadow",
  ease: "--sw-ease",
} as const;

export type ForgeTheme = typeof forgeTheme;
