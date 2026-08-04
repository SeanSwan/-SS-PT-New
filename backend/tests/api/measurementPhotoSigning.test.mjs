/**
 * measurementPhotoSigning.test.mjs — serve-photo hardening locks
 * ============================================================================
 * Body/health photos (`measurements` category) must never be permanently
 * fetchable from a leaked URL. Locks:
 *   S1 signer unit behavior: roundtrip, tamper, expiry, passthrough, strip,
 *      fail-closed without a secret.
 *   S2 proxy gate source contract: sensitive categories 401 without a valid
 *      signature; other categories untouched.
 *   S3 controller source contract: every measurement response presents SIGNED
 *      photoUrls; every write strips signatures (bare paths in storage).
 *   S4 upload route returns bare photoUrls + signed photoPreviewUrls.
 *   S5 storage service never emits R2_PUBLIC_URL for sensitive categories.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  PHOTO_URL_TTL_SECONDS,
  SENSITIVE_PHOTO_CATEGORIES,
  isSensitivePhotoPath,
  signPhotoPath,
  signPhotoUrls,
  stripPhotoSignature,
  stripPhotoSignatures,
  verifySignedPhotoPath,
} from '../../services/photoUrlSigner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');

const MEASUREMENT_PATH = '/api/serve-photo/photos/measurements/42/2026-07/abc-123.jpg';
const SOCIAL_PATH = '/api/serve-photo/photos/social/42/2026-07/abc-123.jpg';

describe('S1 — photoUrlSigner unit behavior', () => {
  beforeEach(() => {
    vi.stubEnv('PHOTO_URL_SIGNING_SECRET', 'unit-test-photo-secret');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('signs a measurement path and the signature verifies', () => {
    const signed = signPhotoPath(MEASUREMENT_PATH);
    const url = new URL(`http://x${signed}`);
    expect(url.pathname).toBe(MEASUREMENT_PATH);
    const exp = url.searchParams.get('exp');
    const sig = url.searchParams.get('sig');
    expect(Number(exp)).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(Number(exp)).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + PHOTO_URL_TTL_SECONDS + 5);
    expect(verifySignedPhotoPath(MEASUREMENT_PATH, exp, sig)).toBe(true);
  });

  it('rejects tampered signatures, tampered paths, and expired timestamps', () => {
    const signed = signPhotoPath(MEASUREMENT_PATH);
    const url = new URL(`http://x${signed}`);
    const exp = url.searchParams.get('exp');
    const sig = url.searchParams.get('sig');

    const tamperedSig = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1); // guaranteed different
    expect(verifySignedPhotoPath(MEASUREMENT_PATH, exp, tamperedSig)).toBe(false);
    expect(verifySignedPhotoPath(MEASUREMENT_PATH.replace('42', '43'), exp, sig)).toBe(false);
    expect(verifySignedPhotoPath(MEASUREMENT_PATH, String(Math.floor(Date.now() / 1000) - 10), sig)).toBe(false);
    // Extending expiry without re-signing must fail (exp is inside the HMAC).
    expect(verifySignedPhotoPath(MEASUREMENT_PATH, String(Number(exp) + 9999), sig)).toBe(false);
  });

  it('passes non-sensitive and non-proxy URLs through untouched', () => {
    expect(signPhotoPath(SOCIAL_PATH)).toBe(SOCIAL_PATH);
    expect(signPhotoPath('https://cdn.example.com/x.jpg')).toBe('https://cdn.example.com/x.jpg');
    expect(isSensitivePhotoPath(MEASUREMENT_PATH)).toBe(true);
    expect(isSensitivePhotoPath(SOCIAL_PATH)).toBe(false);
  });

  it('strip removes exp/sig (and only exp/sig); arrays are handled null-safely', () => {
    const signed = signPhotoPath(MEASUREMENT_PATH);
    expect(stripPhotoSignature(signed)).toBe(MEASUREMENT_PATH);
    expect(stripPhotoSignature(`${MEASUREMENT_PATH}?keep=1&exp=2&sig=abc`)).toBe(`${MEASUREMENT_PATH}?keep=1`);
    expect(stripPhotoSignatures([signed, SOCIAL_PATH])).toEqual([MEASUREMENT_PATH, SOCIAL_PATH]);
    expect(signPhotoUrls(null)).toBeNull();
  });

  it('FAIL-CLOSED: with no secret configured, verification always refuses', () => {
    vi.stubEnv('PHOTO_URL_SIGNING_SECRET', '');
    vi.stubEnv('JWT_SECRET', '');
    const signed = signPhotoPath(MEASUREMENT_PATH); // returns bare path
    expect(signed).toBe(MEASUREMENT_PATH);
    expect(verifySignedPhotoPath(MEASUREMENT_PATH, String(Math.floor(Date.now() / 1000) + 60), 'anything')).toBe(false);
  });

  it('sensitive category set covers measurements', () => {
    expect(SENSITIVE_PHOTO_CATEGORIES.has('measurements')).toBe(true);
  });
});

describe('S2/S3/S4/S5 — wiring source contracts', () => {
  const ROUTES = read('../../core/routes.mjs');
  const CONTROLLER = read('../../controllers/bodyMeasurementController.mjs');
  const MEASUREMENT_ROUTES = read('../../routes/bodyMeasurementRoutes.mjs');
  const STORAGE = read('../../services/photoStorageService.mjs');

  it('S2: the serve-photo proxy refuses unsigned sensitive URLs (fail-closed 401)', () => {
    const gate = ROUTES.slice(
      ROUTES.indexOf("app.get('/api/serve-photo/photos/"),
      ROUTES.indexOf("app.get('/api/serve-photo/gallery/"),
    );
    expect(gate).toMatch(/SENSITIVE_PHOTO_CATEGORIES\.has\(category\)/);
    expect(gate).toMatch(/verifySignedPhotoPath\(barePath, req\.query\.exp, req\.query\.sig\)/);
    expect(gate).toMatch(/401/);
  });

  it('S3: every measurement response presents signed photoUrls; writes strip signatures', () => {
    // presenter defined and photoUrls signed inside it
    expect(CONTROLLER).toMatch(/const presentMeasurement = \(measurement\)/);
    expect(CONTROLLER).toMatch(/plain\.photoUrls = signPhotoUrls\(plain\.photoUrls\)/);
    // all response sites route through the presenter: 5 direct calls
    // (create/getById/update/latest/uploadPhotos) + the list map form.
    const presenterCalls = CONTROLLER.match(/presentMeasurement\(measurement\)/g) ?? [];
    expect(presenterCalls.length).toBeGreaterThanOrEqual(5);
    expect(CONTROLLER).toMatch(/measurements\.map\(presentMeasurement\)/);
    // writes store bare paths
    expect(CONTROLLER).toMatch(/photoUrls: stripPhotoSignatures\(photoUrls \|\| \[\]\)/);
    expect(CONTROLLER).toMatch(/sanitizedUpdate\.photoUrls = stripPhotoSignatures\(sanitizedUpdate\.photoUrls\)/);
    expect(CONTROLLER).toMatch(/\.\.\.stripPhotoSignatures\(photoUrls\)/);
  });

  it('S4: upload-photos returns bare photoUrls for storage + signed previews', () => {
    expect(MEASUREMENT_ROUTES).toMatch(/photoPreviewUrls: signPhotoUrls\(photoUrls\)/);
  });

  it('S5: storage never emits a public bucket URL for sensitive categories', () => {
    expect(STORAGE).toMatch(/R2_PUBLIC_URL && !SENSITIVE_PHOTO_CATEGORIES\.has\(category\)/);
  });

  it('S6: BOTH photo proxies enforce the sensitive-category signature, not just one', () => {
    // Regression 2026-08-04: the `/photos/:category/...` proxy validated `measurements`
    // as an allowed category but skipped the signature gate its `/api/serve-photo/...`
    // twin enforces, so a bare prefix-swap streamed a client's body photo from a
    // permanent unauthenticated link. Both proxies must gate SENSITIVE_PHOTO_CATEGORIES.
    const occurrences = ROUTES.split('SENSITIVE_PHOTO_CATEGORIES.has(category)').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
    // The short-prefix proxy specifically must carry the verify call.
    const shortIdx = ROUTES.indexOf("app.get('/photos/:category/:userId/:yearMonth/:filename'");
    expect(shortIdx).toBeGreaterThan(-1);
    const shortHandler = ROUTES.slice(shortIdx, shortIdx + 1600);
    expect(shortHandler).toContain('verifySignedPhotoPath');
    expect(shortHandler).toContain('Signed URL required or expired');
  });
});
