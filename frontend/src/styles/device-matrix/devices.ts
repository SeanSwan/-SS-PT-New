/**
 * ============================================================================
 * SWAN DEVICE MATRIX — TOP-20 PHONE REGISTRY (2026, US-weighted)
 * ============================================================================
 * Twenty device entries that cover 30+ marketing-name phones (aliases fold
 * models sharing one CSS viewport into a single truth row). Each entry maps
 * to exactly one viewport bucket (P1–P12), which is the level layouts should
 * target — 20 phones collapse into 12 CSS realities. Sean's iPhone XR is
 * `iphone-xr` and is the PRIMARY_DEVICE.
 *
 * Why 20 and not 30: past 20 entries every additional marketing name lands
 * in an already-covered bucket (usually P6/P7 Android classes). More rows
 * add maintenance without adding a single new pixel reality. Aliases carry
 * the long tail instead.
 * ============================================================================
 */

import { bucketForWidth, getBucket, type ViewportBucket } from './buckets';

export type DevicePlatform = 'ios' | 'android';

export interface DeviceProfile {
  /** Stable kebab id (use with media.device()) */
  id: string;
  /** Primary marketing name */
  name: string;
  /** Other marketing names sharing this exact CSS viewport */
  aliases: readonly string[];
  platform: DevicePlatform;
  /** CSS viewport (portrait) */
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  /** Owning viewport bucket id (P1–P12) */
  bucketId: string;
  /** Device has a notch/dynamic-island → honor env(safe-area-inset-*) */
  safeAreaInsets: boolean;
}

const device = (
  id: string,
  name: string,
  aliases: readonly string[],
  platform: DevicePlatform,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  bucketId: string,
  safeAreaInsets = true,
): DeviceProfile => ({
  id, name, aliases, platform, cssWidth, cssHeight, dpr, bucketId, safeAreaInsets,
});

export const DEVICE_MATRIX: readonly DeviceProfile[] = Object.freeze([
  // — iOS —
  device('iphone-xr', 'iPhone XR', ['iPhone 11'], 'ios', 414, 896, 2, 'P1'),
  device('iphone-xs-max', 'iPhone XS Max', ['iPhone 11 Pro Max'], 'ios', 414, 896, 3, 'P1'),
  device('iphone-se-3', 'iPhone SE (3rd gen)', ['iPhone SE (2nd gen)', 'iPhone 8'], 'ios', 375, 667, 2, 'P10', false),
  device('iphone-13-mini', 'iPhone 13 mini', ['iPhone 12 mini', 'iPhone X', 'iPhone XS', 'iPhone 11 Pro'], 'ios', 375, 812, 3, 'P4'),
  device('iphone-14', 'iPhone 14', ['iPhone 12', 'iPhone 13', 'iPhone 16e'], 'ios', 390, 844, 3, 'P2'),
  device('iphone-16', 'iPhone 16', ['iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro'], 'ios', 393, 852, 3, 'P3'),
  device('iphone-17', 'iPhone 17', ['iPhone 16 Pro', 'iPhone 17 Pro'], 'ios', 402, 874, 3, 'P5'),
  device('iphone-14-plus', 'iPhone 14 Plus', ['iPhone 12 Pro Max', 'iPhone 13 Pro Max'], 'ios', 428, 926, 3, 'P8'),
  device('iphone-16-plus', 'iPhone 16 Plus', ['iPhone 14 Pro Max', 'iPhone 15 Plus', 'iPhone 15 Pro Max'], 'ios', 430, 932, 3, 'P8'),
  device('iphone-17-pro-max', 'iPhone 17 Pro Max', ['iPhone 16 Pro Max'], 'ios', 440, 956, 3, 'P11'),
  // — Android —
  device('galaxy-s24', 'Galaxy S24', ['Galaxy S22', 'Galaxy S23', 'Galaxy S25'], 'android', 360, 780, 3, 'P6'),
  device('galaxy-a16', 'Galaxy A16', ['Galaxy A15', 'Galaxy A25', 'Galaxy A36'], 'android', 360, 800, 2, 'P6', false),
  device('galaxy-s25-ultra', 'Galaxy S25 Ultra', ['Galaxy S23 Ultra', 'Galaxy S24 Ultra'], 'android', 384, 832, 3.75, 'P9'),
  device('galaxy-s24-plus', 'Galaxy S24+', ['Galaxy S24 FE', 'Galaxy S25+'], 'android', 384, 832, 3, 'P9'),
  device('pixel-8', 'Pixel 8', ['Pixel 6', 'Pixel 7', 'Pixel 8a'], 'android', 412, 915, 2.625, 'P7'),
  device('pixel-9', 'Pixel 9', ['Pixel 9 Pro'], 'android', 412, 915, 2.625, 'P7'),
  device('moto-g-power', 'Moto G Power', ['Moto G 5G', 'Galaxy A54'], 'android', 412, 915, 1.75, 'P7', false),
  device('galaxy-z-flip-6', 'Galaxy Z Flip 6', ['Galaxy Z Flip 5'], 'android', 360, 880, 3, 'P6'),
  device('galaxy-z-fold-cover', 'Galaxy Z Fold 6 (cover)', ['Galaxy Z Fold 5 (cover)'], 'android', 344, 882, 2.75, 'P12'),
  // — Floor —
  device('legacy-floor', 'Legacy floor (SE1 / display-zoom)', ['iPhone SE (1st gen)', 'display-zoomed Androids'], 'ios', 320, 568, 2, 'P12', false),
]);

/** Sean's real phone — the first device every layout is verified on. */
export const PRIMARY_DEVICE_ID = 'iphone-xr';

const byId = new Map(DEVICE_MATRIX.map((profile) => [profile.id, profile]));

export const getDevice = (id: string): DeviceProfile => {
  const profile = byId.get(id);
  if (!profile) {
    throw new Error(`device-matrix: unknown device "${id}"`);
  }
  return profile;
};

export const bucketOfDevice = (id: string): ViewportBucket =>
  getBucket(getDevice(id).bucketId);

/** Sanity: every device's viewport must resolve into its declared bucket. */
export const devicesConsistentWithBuckets = (): boolean =>
  DEVICE_MATRIX.every((profile) => {
    const resolved = bucketForWidth(profile.cssWidth, profile.cssHeight);
    return resolved !== null && resolved.id === profile.bucketId;
  });
