/**
 * Photo-serve proxy — R2 namespace allowlist contract (hostile review R5-05)
 * ========================================================================
 * The defect. `/api/serve-photo/photos/:category/:userId/:yearMonth/:filename` validated
 * `category` against an inline allowlist that omitted `swan-spotlight`. The Spotlight bridge
 * re-hosts with `category: 'swan-spotlight'`, so when `R2_PUBLIC_URL` is unset — which is the
 * case in every env file in this repo — the uploader returns
 * `/api/serve-photo/photos/swan-spotlight/0/<yyyy-mm>/<uuid>.<ext>` and the proxy answered
 * **400 Invalid photo path**. The upload had succeeded, `storage` was `'r2'`, the row stored a
 * URL, and the card could not render.
 *
 * What this file pins, and why it is written this way. The point of R5-05 is not "a string was
 * missing from an array" — it is that the uploader's output and the proxy's acceptance rule were
 * allowed to disagree, with nothing testing them against each other. So the central case below
 * does NOT hand-write a URL. It reads the objectKey template out of `photoStorageService.mjs`,
 * builds the key the way the uploader builds it, splits it the way Express splits it, and
 * requires the route's guard to accept it. If either side's shape changes, this fails.
 *
 * The negative cases matter as much: Astra's review explicitly warned against "fixing" this by
 * replacing the allowlist with unrestricted path acceptance. A wildcard would pass every
 * positive case here and fail the negatives.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PHOTO_SERVE_CATEGORIES,
  isServablePhotoCategory,
} from '../../core/photoServeCategories.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const UPLOADER_SRC = join(HERE, '..', '..', 'services', 'photoStorageService.mjs');

/**
 * The three non-category guards, copied verbatim from `core/routes.mjs:551-553`. Kept here so
 * the positive case exercises the whole predicate rather than only the half that was broken.
 */
const userIdOk = (v) => /^\d+$/.test(v);
const yearMonthOk = (v) => /^\d{4}-\d{2}$/.test(v);
const filenameOk = (v) => /^[\w-]+\.\w+$/.test(v);

/** The full route predicate, in the same order the route applies it. */
const routeAccepts = ({ category, userId, yearMonth, filename }) =>
  isServablePhotoCategory(category) &&
  userIdOk(userId) &&
  yearMonthOk(yearMonth) &&
  filenameOk(filename);

/**
 * Build an objectKey from the REAL uploader template, so this test cannot drift from the code
 * it is about. Reads `photoStorageService.mjs`, extracts the `photos/...` template, and
 * substitutes the values the Spotlight re-host actually passes.
 */
const uploaderTemplate = () => {
  const src = readFileSync(UPLOADER_SRC, 'utf8');
  const m = src.match(/const objectKey = `(photos\/[^`]+)`/);
  if (!m) throw new Error('could not find the objectKey template in photoStorageService.mjs');
  return m[1];
};

const buildObjectKey = (category, userId, yearMonth, uuid, ext) =>
  uploaderTemplate()
    .replace('${category}', category)
    .replace('${userId}', String(userId))
    .replace('${yearMonth}', yearMonth)
    .replace('${uuidv4()}', uuid)
    .replace('${ext}', ext);

/** Split an objectKey exactly as the Express route splits it. */
const parseAsRoute = (objectKey) => {
  const m = /^photos\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(objectKey);
  if (!m) throw new Error(`objectKey does not match the route shape: ${objectKey}`);
  const [, category, userId, yearMonth, filename] = m;
  return { category, userId, yearMonth, filename };
};

/** What `bridgeSpotlightImageRehost.mjs:51-56` passes, and what `uuidv4()` produces. */
const SPOTLIGHT = { category: 'swan-spotlight', userId: 0 };
const UUID = '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f';
const YM = '2026-09';

describe('R5-05 — the uploader template still has the shape the proxy parses', () => {
  it('reads the real template, not an assumed one', () => {
    expect(uploaderTemplate()).toBe('photos/${category}/${userId}/${yearMonth}/${uuidv4()}.${ext}');
  });
});

describe('R5-05 — the Spotlight re-host output is accepted end to end', () => {
  it('admits the exact namespace the bridge re-hosts into', () => {
    expect(PHOTO_SERVE_CATEGORIES).toContain('swan-spotlight');
  });

  it('accepts the URL the REAL uploader contract produces', () => {
    const key = buildObjectKey(SPOTLIGHT.category, SPOTLIGHT.userId, YM, UUID, 'jpg');
    expect(key).toBe(`photos/swan-spotlight/0/${YM}/${UUID}.jpg`);

    // The whole predicate the route applies — this is the case that was failing with 400.
    expect(routeAccepts(parseAsRoute(key))).toBe(true);
  });

  it('accepts it for every extension the sniffer can emit', () => {
    for (const ext of ['jpg', 'png', 'webp', 'gif', 'heic']) {
      const key = buildObjectKey(SPOTLIGHT.category, SPOTLIGHT.userId, YM, UUID, ext);
      expect(routeAccepts(parseAsRoute(key)), `ext=${ext}`).toBe(true);
    }
  });
});

describe('R5-05 — the boundary is still a boundary, not a wildcard', () => {
  it('rejects a namespace that was never admitted', () => {
    expect(isServablePhotoCategory('private-uploads')).toBe(false);
    const key = buildObjectKey('private-uploads', SPOTLIGHT.userId, YM, UUID, 'jpg');
    expect(routeAccepts(parseAsRoute(key))).toBe(false);
  });

  it('is an exact match, so a prefix cannot ride in on a permitted name', () => {
    for (const near of ['profiles-backup', 'social-photos-archive', 'swan-spotlight-private', 'products2']) {
      expect(isServablePhotoCategory(near), near).toBe(false);
    }
  });

  it('is case-sensitive, because R2 keys are', () => {
    expect(isServablePhotoCategory('Swan-Spotlight')).toBe(false);
    expect(isServablePhotoCategory('SWAN-SPOTLIGHT')).toBe(false);
  });

  it('rejects non-string input rather than coercing it', () => {
    for (const bad of [undefined, null, 0, [], {}, true]) {
      expect(isServablePhotoCategory(bad)).toBe(false);
    }
  });

  it('cannot be widened at runtime — the list is frozen', () => {
    expect(Object.isFrozen(PHOTO_SERVE_CATEGORIES)).toBe(true);
  });
});

describe('R5-05 — no namespace that previously worked was lost', () => {
  it('retains every category the allowlist already served', () => {
    for (const c of ['profiles', 'banners', 'banner-collage', 'measurements',
      'social', 'social-photos', 'social-videos', 'products']) {
      expect(PHOTO_SERVE_CATEGORIES, c).toContain(c);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(PHOTO_SERVE_CATEGORIES).size).toBe(PHOTO_SERVE_CATEGORIES.length);
  });
});
