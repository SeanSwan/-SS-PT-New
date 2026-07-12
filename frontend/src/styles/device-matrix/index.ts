/**
 * SWAN DEVICE MATRIX — public surface.
 * Portable pixel-perfect phone system: top-20 device registry (30+ models
 * via aliases), P1–P12 viewport buckets aligned with tools/viewport-sweep,
 * pure-string media builders, safe-area helpers, and the lens-aware
 * container-query grid engine. See README.md for the portability contract.
 */

export {
  VIEWPORT_BUCKETS,
  PRIMARY_BUCKET_ID,
  getBucket,
  bucketForWidth,
  disambiguate375,
  type ViewportBucket,
} from './buckets';

export {
  DEVICE_MATRIX,
  PRIMARY_DEVICE_ID,
  getDevice,
  bucketOfDevice,
  devicesConsistentWithBuckets,
  type DeviceProfile,
  type DevicePlatform,
} from './devices';

export {
  media,
  safeArea,
  supportsSafeArea,
  PHONE_MAX_WIDTH,
  TOUCH_TARGET_MIN_PX,
} from './media';

export {
  SwanGrid,
  SwanGridFrame,
  bucketAreas,
  lensGap,
  lensPanel,
  GRID_SPACE,
  type SwanGridPreset,
} from './grid';

export const DEVICE_MATRIX_VERSION = '1.0.0';
