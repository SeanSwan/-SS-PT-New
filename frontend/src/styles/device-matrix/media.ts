/**
 * ============================================================================
 * SWAN DEVICE MATRIX — MEDIA QUERY BUILDERS (portable core, zero deps)
 * ============================================================================
 * Pure-string @media builders for styled-components (or any CSS-in-JS):
 *
 *   import { media } from 'styles/device-matrix';
 *   ${media.bucket('P1')} { ... }        // range query — layout work
 *   ${media.device('iphone-xr')} { ... } // device-pinned — surgical fixes
 *   ${media.phone} { ... }               // any phone-class viewport
 *
 * Strings do NOT include the `@media ` prefix-space contract: they include
 * the full `@media (...)` text so interpolation reads naturally.
 *
 * RULE OF THUMB — buckets for layout, device pins for one-phone bug fixes.
 * A device-pinned query that changes layout is a smell; a bucket query
 * that chases one phone's quirk is a smell in the other direction.
 * ============================================================================
 */

import { getBucket, VIEWPORT_BUCKETS } from './buckets';
import { getDevice } from './devices';

/** Largest phone-class CSS width the matrix owns (P11 upper bound). */
export const PHONE_MAX_WIDTH = Math.max(
  ...VIEWPORT_BUCKETS.map(({ range }) => range[1]),
);

const q = (condition: string): string => `@media ${condition}`;

export const media = {
  /* ── range primitives ─────────────────────────────────────────────── */
  min: (px: number): string => q(`(min-width: ${px}px)`),
  max: (px: number): string => q(`(max-width: ${px}px)`),
  between: (minPx: number, maxPx: number): string =>
    q(`(min-width: ${minPx}px) and (max-width: ${maxPx}px)`),

  /* ── bucket + device targeting ────────────────────────────────────── */
  /** Range query owned by one viewport bucket (use for layout). */
  bucket: (id: string): string => {
    const { range } = getBucket(id);
    return q(`(min-width: ${range[0]}px) and (max-width: ${range[1]}px)`);
  },
  /**
   * Device-pinned query: width range + portrait/landscape-agnostic
   * device dimensions + DPR. Use ONLY for surgical one-device fixes.
   */
  device: (id: string): string => {
    const { cssWidth, cssHeight, dpr } = getDevice(id);
    return q(
      `(device-width: ${cssWidth}px) and (device-height: ${cssHeight}px) and (-webkit-device-pixel-ratio: ${dpr})`,
    );
  },
  /**
   * The 375 disambiguators — 375px is two very different phones.
   * Pair every 375 width rule with one of these height gates.
   */
  shortPhone375: (): string =>
    q(`(min-width: 374px) and (max-width: 376px) and (max-height: 700px)`),
  tallPhone375: (): string =>
    q(`(min-width: 374px) and (max-width: 376px) and (min-height: 701px)`),

  /* ── device-class tiers ───────────────────────────────────────────── */
  /** Any phone-class viewport the matrix owns (320 → widest mainstream). */
  phone: q(`(max-width: ${Math.max(
    ...VIEWPORT_BUCKETS.map(({ range }) => range[1]),
  )}px)`),
  tablet: q(`(min-width: 453px) and (max-width: 1024px)`),
  desktop: q(`(min-width: 1025px)`),
  /** Height-constrained phones (SE class, landscape) — collapse chrome. */
  shortViewport: (maxPx = 700): string => q(`(max-height: ${maxPx}px)`),
  landscapePhone: q(
    `(max-height: 500px) and (orientation: landscape) and (pointer: coarse)`,
  ),

  /* ── capability + preference gates ────────────────────────────────── */
  touch: q(`(hover: none) and (pointer: coarse)`),
  pointerFine: q(`(hover: hover) and (pointer: fine)`),
  reducedMotion: q(`(prefers-reduced-motion: reduce)`),
  standalonePwa: q(`(display-mode: standalone)`),
  highDensity: q(`(min-resolution: 2dppx)`),
} as const;

/* ── safe-area helpers (env(), not media queries) ─────────────────────── */

type SafeAreaSide = 'top' | 'right' | 'bottom' | 'left';

/**
 * Notch-safe padding with a design fallback:
 *   padding-bottom: ${safeArea('bottom', '16px')};
 * → max(16px, env(safe-area-inset-bottom))
 */
export const safeArea = (side: SafeAreaSide, fallback = '0px'): string =>
  `max(${fallback}, env(safe-area-inset-${side}))`;

/** @supports gate for safe-area-capable browsers. */
export const supportsSafeArea = '@supports (padding: env(safe-area-inset-top))';

/**
 * 44px minimum touch target (CLAUDE.md rule 2) as a reusable constant so
 * portable consumers inherit the Swan bar without importing app code.
 */
export const TOUCH_TARGET_MIN_PX = 44;
