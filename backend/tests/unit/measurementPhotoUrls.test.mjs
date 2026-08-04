/**
 * measurementPhotoUrls — SWA-129 Kimi call 5 (IDOR-by-path + arbitrary URL).
 * The measurement `photoUrls[]` array was persisted verbatim; photoUrlSigner
 * HMAC-signs ANY `/api/serve-photo/photos/measurements/{id}/...` path on read,
 * so a caller could store a path pointing at another user's (a minor's) photo
 * and read it back signed — or store an external / javascript: URL that renders
 * in the trainer/admin dashboard. These tests encode both attacks and prove the
 * legitimate uploader path (and multi-editor re-submit) still passes.
 */
import { describe, it, expect } from 'vitest';
import {
  validateMeasurementPhotoUrls,
  parseServePhotoPath,
} from '../../utils/photoRecordValidation.mjs';

const UPLOADER = 42;
const VICTIM = 123;
const owned = `/api/serve-photo/photos/measurements/${UPLOADER}/2026-08/abc.jpg`;
const victim = `/api/serve-photo/photos/measurements/${VICTIM}/2026-08/secret.jpg`;

describe('CRITICAL — IDOR-by-path: a photo path owned by another user is rejected', () => {
  it("rejects a photoUrl pointing at the VICTIM's measurement photo", () => {
    const r = validateMeasurementPhotoUrls([victim], { uploaderId: UPLOADER });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not owned/i);
  });

  it('accepts the uploader\'s own owned path', () => {
    expect(validateMeasurementPhotoUrls([owned], { uploaderId: UPLOADER }).ok).toBe(true);
  });

  it('parseServePhotoPath binds the owner segment', () => {
    expect(parseServePhotoPath(owned)?.ownerId).toBe(String(UPLOADER));
    expect(parseServePhotoPath(victim)?.ownerId).toBe(String(VICTIM));
  });
});

describe('CRITICAL — external / dangerous-scheme URLs are rejected', () => {
  it.each([
    'https://evil.example/tracking-pixel.png',
    'javascript:alert(document.cookie)',
    'data:text/html,<script>1</script>',
    'file:///etc/passwd',
    '//evil.example/x.jpg',
    'http://169.254.169.254/latest/meta-data/',
  ])('rejects %j', (bad) => {
    const r = validateMeasurementPhotoUrls([bad], { uploaderId: UPLOADER });
    expect(r.ok).toBe(false);
  });
});

describe('HIGH — traversal / malformed serve-photo paths are rejected', () => {
  it.each([
    `/api/serve-photo/photos/measurements/${UPLOADER}/../${VICTIM}/x.jpg`,
    `/api/serve-photo/photos/measurements/${UPLOADER}/%2e%2e/x.jpg`,
    '/api/serve-photo/photos/measurements/x.jpg',              // no id segment
    '/api/serve-photo/photos/measurements//2026/x.jpg',        // empty owner
    '/photos/measurements/42/x.jpg',                            // wrong prefix
    'photos/measurements/42/x.jpg',                             // bare key, not a serve path
  ])('rejects malformed %j', (bad) => {
    expect(validateMeasurementPhotoUrls([bad], { uploaderId: UPLOADER }).ok).toBe(false);
  });
});

describe('multi-editor & bounds', () => {
  it('preserves a photo already stored on the measurement even if owned by someone else', () => {
    // A second trainer re-submits the full list including a photo the FIRST
    // trainer uploaded (their id). It is already stored → must not be rejected.
    const r = validateMeasurementPhotoUrls([victim, owned], {
      uploaderId: UPLOADER,
      existing: [victim],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a NEW cross-user path even when other existing photos are present', () => {
    const r = validateMeasurementPhotoUrls([owned, victim], {
      uploaderId: UPLOADER,
      existing: [owned], // victim is NOT existing → still an attack
    });
    expect(r.ok).toBe(false);
  });

  it('caps the array length', () => {
    const many = Array.from({ length: 21 }, (_, i) => `/api/serve-photo/photos/measurements/${UPLOADER}/2026-08/p${i}.jpg`);
    expect(validateMeasurementPhotoUrls(many, { uploaderId: UPLOADER }).ok).toBe(false);
  });

  it('null / undefined / empty are accepted as no-op (no photos submitted)', () => {
    expect(validateMeasurementPhotoUrls(undefined, { uploaderId: UPLOADER }).ok).toBe(true);
    expect(validateMeasurementPhotoUrls(null, { uploaderId: UPLOADER }).ok).toBe(true);
    expect(validateMeasurementPhotoUrls([], { uploaderId: UPLOADER }).ok).toBe(true);
  });

  it('rejects a non-array', () => {
    expect(validateMeasurementPhotoUrls('nope', { uploaderId: UPLOADER }).ok).toBe(false);
  });

  it('tolerates a signed query string on an already-stored path', () => {
    const signed = `${owned}?exp=123&sig=deadbeef`;
    const r = validateMeasurementPhotoUrls([signed], { uploaderId: UPLOADER });
    expect(r.ok).toBe(true); // owner segment still binds after stripping ?query
  });
});
