/**
 * buckets.mjs — the P1–P12 mobile viewport truth (portable data module)
 * =======================================================================
 * Derived 2026-07-07 from top-50-phone research (Counterpoint sellers,
 * TelemetryDeck install base, StatCounter US Jan–Jun 2026). Together these
 * cover ~93% of identifiable US mobile traffic. Source + methodology:
 * docs/ai-workflow/references/MOBILE-VIEWPORT-MATRIX.md (SwanStudios) — but
 * this module is app-agnostic: ZERO imports, safe to copy anywhere.
 *
 * pixelPerfect=false marks degrade-gracefully floors (layout intact, nothing
 * clipped, no horizontal scroll — but not held to pixel-perfect polish).
 */
export const VIEWPORT_BUCKETS = [
  { id: 'P1', width: 414, height: 896, dpr: 2, standsFor: 'iPhone XR / 11 / XS Max / 11 Pro Max', usShare: 18.8, pixelPerfect: true },
  { id: 'P2', width: 390, height: 844, dpr: 3, standsFor: 'iPhone 12 / 13 / 14 / 16e', usShare: 12.4, pixelPerfect: true },
  { id: 'P3', width: 393, height: 852, dpr: 3, standsFor: 'iPhone 14 Pro / 15 / 16', usShare: 6.3, pixelPerfect: true },
  { id: 'P4', width: 375, height: 812, dpr: 3, standsFor: 'iPhone X / 12-13 mini', usShare: 6.7, pixelPerfect: true },
  { id: 'P5', width: 402, height: 874, dpr: 3, standsFor: 'iPhone 16 Pro / 17 / 17 Pro', usShare: 4.3, pixelPerfect: true },
  { id: 'P6', width: 360, height: 780, dpr: 3, standsFor: 'Galaxy S22-S25 + A15/A16/A25/A36', usShare: 4.0, pixelPerfect: true },
  { id: 'P7', width: 412, height: 915, dpr: 2.625, standsFor: 'Pixel 6-8a / Moto G / Galaxy A5x', usShare: 3.0, pixelPerfect: true },
  { id: 'P8', width: 430, height: 932, dpr: 3, standsFor: 'iPhone 14-16 Pro Max / Plus class', usShare: 3.5, pixelPerfect: true },
  { id: 'P9', width: 384, height: 832, dpr: 3.75, standsFor: 'Galaxy S23-S25 Ultra (WQHD)', usShare: 4.4, pixelPerfect: true },
  { id: 'P10', width: 375, height: 667, dpr: 2, standsFor: 'iPhone SE2/SE3/8 (shortest mainstream)', usShare: 3.3, pixelPerfect: true },
  { id: 'P11', width: 440, height: 956, dpr: 3, standsFor: 'iPhone 16/17 Pro Max (widest mainstream)', usShare: 3.0, pixelPerfect: true },
  { id: 'P12', width: 320, height: 568, dpr: 2, standsFor: 'Legacy SE1 + display-zoomed Androids (floor)', usShare: 2.0, pixelPerfect: false },
];

export default VIEWPORT_BUCKETS;
