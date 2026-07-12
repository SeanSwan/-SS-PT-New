/**
 * Device Matrix truth locks.
 * Locks the portable package's internal consistency AND its byte-level
 * alignment with the QA-side truth at tools/viewport-sweep/buckets.mjs.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bucketForWidth,
  disambiguate375,
  getBucket,
  PRIMARY_BUCKET_ID,
  VIEWPORT_BUCKETS,
} from './buckets';
import {
  bucketOfDevice,
  DEVICE_MATRIX,
  devicesConsistentWithBuckets,
  getDevice,
  PRIMARY_DEVICE_ID,
} from './devices';
import { media, PHONE_MAX_WIDTH, safeArea, TOUCH_TARGET_MIN_PX } from './media';

describe('viewport buckets', () => {
  it('defines exactly the 12 P-buckets with unique ids', () => {
    expect(VIEWPORT_BUCKETS).toHaveLength(12);
    expect(new Set(VIEWPORT_BUCKETS.map(({ id }) => id)).size).toBe(12);
  });

  it('keeps iPhone XR (P1) as the primary bucket and largest US share', () => {
    const primary = getBucket(PRIMARY_BUCKET_ID);
    expect(primary.width).toBe(414);
    expect(primary.height).toBe(896);
    const maxShare = Math.max(...VIEWPORT_BUCKETS.map(({ usShare }) => usShare));
    expect(primary.usShare).toBe(maxShare);
  });

  it('every canonical width resolves back to its own bucket (with height)', () => {
    for (const bucket of VIEWPORT_BUCKETS) {
      expect(bucketForWidth(bucket.width, bucket.height)?.id).toBe(bucket.id);
    }
  });

  it('disambiguates the 375 collision by height', () => {
    expect(disambiguate375(667).id).toBe('P10');
    expect(disambiguate375(812).id).toBe('P4');
  });

  it('returns null above phone territory', () => {
    expect(bucketForWidth(PHONE_MAX_WIDTH + 1)).toBeNull();
    expect(bucketForWidth(768)).toBeNull();
  });

  it('stays byte-aligned with tools/viewport-sweep/buckets.mjs', () => {
    const sweepSource = readFileSync(
      resolve(__dirname, '../../../../tools/viewport-sweep/buckets.mjs'),
      'utf8',
    );
    for (const bucket of VIEWPORT_BUCKETS) {
      const row = new RegExp(
        `id:\\s*'${bucket.id}',\\s*width:\\s*(\\d+),\\s*height:\\s*(\\d+),\\s*dpr:\\s*([\\d.]+)`,
      ).exec(sweepSource);
      expect(row, `bucket ${bucket.id} missing from viewport-sweep`).not.toBeNull();
      expect(Number(row![1]), `${bucket.id} width drift vs sweep`).toBe(bucket.width);
      expect(Number(row![2]), `${bucket.id} height drift vs sweep`).toBe(bucket.height);
      expect(Number(row![3]), `${bucket.id} dpr drift vs sweep`).toBe(bucket.dpr);
    }
  });
});

describe('device registry', () => {
  it('registers exactly 20 devices with unique ids covering 30+ models', () => {
    expect(DEVICE_MATRIX).toHaveLength(20);
    expect(new Set(DEVICE_MATRIX.map(({ id }) => id)).size).toBe(20);
    const modelCount = DEVICE_MATRIX.reduce(
      (total, { aliases }) => total + 1 + aliases.length,
      0,
    );
    expect(modelCount).toBeGreaterThanOrEqual(30);
  });

  it("keeps Sean's iPhone XR as the primary device in bucket P1", () => {
    const primary = getDevice(PRIMARY_DEVICE_ID);
    expect(primary.cssWidth).toBe(414);
    expect(primary.cssHeight).toBe(896);
    expect(primary.bucketId).toBe('P1');
    expect(bucketOfDevice(PRIMARY_DEVICE_ID).id).toBe(PRIMARY_BUCKET_ID);
  });

  it('every device resolves into its declared bucket', () => {
    expect(devicesConsistentWithBuckets()).toBe(true);
  });

  it('marks safe-area honesty per device class', () => {
    expect(getDevice('iphone-xr').safeAreaInsets).toBe(true);
    expect(getDevice('iphone-se-3').safeAreaInsets).toBe(false);
  });
});

describe('media builders', () => {
  it('builds bucket range queries', () => {
    expect(media.bucket('P1')).toBe(
      '@media (min-width: 413px) and (max-width: 415px)',
    );
  });

  it('builds device-pinned queries for surgical fixes', () => {
    expect(media.device('iphone-xr')).toBe(
      '@media (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
    );
  });

  it('gates the 375 collision by height', () => {
    expect(media.shortPhone375()).toContain('(max-height: 700px)');
    expect(media.tallPhone375()).toContain('(min-height: 701px)');
  });

  it('exposes safe-area helpers and the 44px floor', () => {
    expect(safeArea('bottom', '16px')).toBe(
      'max(16px, env(safe-area-inset-bottom))',
    );
    expect(TOUCH_TARGET_MIN_PX).toBe(44);
  });

  it('throws loudly on unknown ids (fail-closed, no silent fallback)', () => {
    expect(() => media.bucket('P99')).toThrow(/unknown viewport bucket/);
    expect(() => media.device('nokia-3310')).toThrow(/unknown device/);
  });
});
