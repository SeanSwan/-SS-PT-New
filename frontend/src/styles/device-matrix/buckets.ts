/**
 * ============================================================================
 * SWAN DEVICE MATRIX — VIEWPORT BUCKETS (portable core, zero app imports)
 * ============================================================================
 * The 12 mobile viewport buckets (P1–P12) that cover ~93% of US phone
 * traffic in 2026. IDs are BYTE-ALIGNED with the QA-side truth module at
 * `tools/viewport-sweep/buckets.mjs` so a design decision and its QA sweep
 * always speak the same language. P1 (iPhone XR class) is the house
 * primary — it is Sean's real device and the largest single US share.
 *
 * PORTABILITY CONTRACT: this folder (`styles/device-matrix/`) imports
 * NOTHING from the app. Copy the folder into any project and it works.
 * `grid.ts` is the only file with a styled-components peer dependency.
 * ============================================================================
 */

export interface ViewportBucket {
  /** Stable bucket id — matches tools/viewport-sweep/buckets.mjs */
  id: string;
  /** Canonical CSS viewport width used for pixel-perfect passes */
  width: number;
  /** Canonical CSS viewport height (portrait) */
  height: number;
  /** Representative devicePixelRatio */
  dpr: number;
  /** Inclusive CSS-width range this bucket owns for range queries */
  range: readonly [number, number];
  /** Human description of what lives here */
  standsFor: string;
  /** Approximate US traffic share (%) — from the 2026 M.1 doctrine */
  usShare: number;
  /** Whether the pixel-perfect bar applies (P12 floor is fit-not-perfect) */
  pixelPerfect: boolean;
}

/**
 * Canonical bucket order is DESCENDING usShare (P1 first) — iterate in
 * this order when prioritizing fix passes.
 */
export const VIEWPORT_BUCKETS: readonly ViewportBucket[] = Object.freeze([
  { id: 'P1', width: 414, height: 896, dpr: 2, range: [413, 415], standsFor: 'iPhone XR / 11 / XS Max / 11 Pro Max', usShare: 18.8, pixelPerfect: true },
  { id: 'P2', width: 390, height: 844, dpr: 3, range: [389, 391], standsFor: 'iPhone 12 / 13 / 14 / 16e', usShare: 12.4, pixelPerfect: true },
  { id: 'P4', width: 375, height: 812, dpr: 3, range: [374, 376], standsFor: 'iPhone X / XS / 11 Pro / 12–13 mini (tall 375)', usShare: 6.7, pixelPerfect: true },
  { id: 'P3', width: 393, height: 852, dpr: 3, range: [392, 394], standsFor: 'iPhone 14 Pro / 15 / 16', usShare: 6.3, pixelPerfect: true },
  { id: 'P9', width: 384, height: 832, dpr: 3.75, range: [383, 385], standsFor: 'Galaxy S23–S25 Ultra + S24+/FE class', usShare: 4.4, pixelPerfect: true },
  { id: 'P5', width: 402, height: 874, dpr: 3, range: [401, 403], standsFor: 'iPhone 16 Pro / 17 / 17 Pro', usShare: 4.3, pixelPerfect: true },
  { id: 'P6', width: 360, height: 780, dpr: 3, range: [345, 373], standsFor: 'Galaxy S22–S25 + A-series + Z Flip (360-class Androids)', usShare: 4.0, pixelPerfect: true },
  { id: 'P8', width: 430, height: 932, dpr: 3, range: [427, 431], standsFor: 'iPhone Pro Max / Plus class (428–430)', usShare: 3.5, pixelPerfect: true },
  { id: 'P10', width: 375, height: 667, dpr: 2, range: [374, 376], standsFor: 'iPhone SE 2/3 / 8 (SHORT 375 — height-gate it)', usShare: 3.3, pixelPerfect: true },
  { id: 'P7', width: 412, height: 915, dpr: 2.625, range: [404, 426], standsFor: 'Pixel 6–9 / Moto G / Galaxy A5x (412-class Androids)', usShare: 3.0, pixelPerfect: true },
  { id: 'P11', width: 440, height: 956, dpr: 3, range: [432, 452], standsFor: 'iPhone 16/17 Pro Max (widest mainstream)', usShare: 3.0, pixelPerfect: true },
  { id: 'P12', width: 320, height: 568, dpr: 2, range: [320, 344], standsFor: 'Legacy SE1 + display-zoom + fold cover screens (fit floor)', usShare: 2.0, pixelPerfect: false },
]);

/** P1 — the house primary. Design here first, verify here first. */
export const PRIMARY_BUCKET_ID = 'P1';

const byId = new Map(VIEWPORT_BUCKETS.map((bucket) => [bucket.id, bucket]));

export const getBucket = (id: string): ViewportBucket => {
  const bucket = byId.get(id);
  if (!bucket) {
    throw new Error(`device-matrix: unknown viewport bucket "${id}"`);
  }
  return bucket;
};

/**
 * Resolve which bucket owns a CSS viewport. Width ranges can collide
 * (375 is BOTH P4 tall iPhones and P10 short SEs) — pass the height to
 * disambiguate; without a height, ties resolve to the higher-usShare
 * bucket (canonical array order). Widths outside every phone range
 * return null — that is tablet/desktop territory.
 */
export const bucketForWidth = (
  cssWidth: number,
  cssHeight?: number,
): ViewportBucket | null => {
  const matches = VIEWPORT_BUCKETS.filter(
    ({ range: [min, max] }) => cssWidth >= min && cssWidth <= max,
  );
  if (matches.length === 0) return null;
  if (matches.length === 1 || cssHeight === undefined) return matches[0];
  return matches.reduce((best, bucket) =>
    Math.abs(bucket.height - cssHeight) < Math.abs(best.height - cssHeight)
      ? bucket
      : best,
  );
};

/**
 * The disambiguator for the 375 collision (P4 tall vs P10 short):
 * two very different phones share one CSS width — ALWAYS pair a height
 * gate with a 375 width query. This is the single most common
 * pixel-perfect mistake on iPhone minis vs SEs.
 */
export const disambiguate375 = (cssHeight: number): ViewportBucket =>
  cssHeight <= 700 ? getBucket('P10') : getBucket('P4');
