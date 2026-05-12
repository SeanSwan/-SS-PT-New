/**
 * imageUrl — backend photo-URL allowlist tests
 *
 * Mirrors frontend/src/utils/imageUrl.test.ts. If a case starts passing here
 * but failing on the frontend (or vice versa), the two layers have drifted
 * and the dual-defense premise no longer holds.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sanitizeImageUrl } from '../../utils/imageUrl.mjs';

describe('sanitizeImageUrl', () => {
  const ORIGINAL_ENV = process.env.PHOTO_ORIGINS;

  beforeEach(() => {
    delete process.env.PHOTO_ORIGINS;
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.PHOTO_ORIGINS;
    } else {
      process.env.PHOTO_ORIGINS = ORIGINAL_ENV;
    }
  });

  // ── Acceptance: fallback origins ───────────────────────────────────────
  it('accepts https://sswanstudios.com URL with the default origin list', () => {
    expect(sanitizeImageUrl('https://sswanstudios.com/uploads/a.png'))
      .toBe('https://sswanstudios.com/uploads/a.png');
  });

  it('accepts cdn + media subdomains on the default origin list', () => {
    expect(sanitizeImageUrl('https://cdn.sswanstudios.com/x/y.jpg'))
      .toBe('https://cdn.sswanstudios.com/x/y.jpg');
    expect(sanitizeImageUrl('https://media.sswanstudios.com/r2-key.webp'))
      .toBe('https://media.sswanstudios.com/r2-key.webp');
  });

  it('accepts relative /uploads paths (local-dev photoStorageService)', () => {
    expect(sanitizeImageUrl('/uploads/profile/u-1-abc.jpg'))
      .toBe('/uploads/profile/u-1-abc.jpg');
  });

  // ── Rejection: malformed / wrong scheme ────────────────────────────────
  it('rejects null / undefined / empty / whitespace-only', () => {
    expect(sanitizeImageUrl(null)).toBeNull();
    expect(sanitizeImageUrl(undefined)).toBeNull();
    expect(sanitizeImageUrl('')).toBeNull();
    expect(sanitizeImageUrl('   ')).toBeNull();
  });

  it('rejects non-string input (number, object, array)', () => {
    expect(sanitizeImageUrl(42)).toBeNull();
    expect(sanitizeImageUrl({ url: 'https://sswanstudios.com/a.png' })).toBeNull();
    expect(sanitizeImageUrl(['https://sswanstudios.com/a.png'])).toBeNull();
  });

  it('rejects non-https protocols even on allowed origins', () => {
    expect(sanitizeImageUrl('http://sswanstudios.com/a.png')).toBeNull();
    expect(sanitizeImageUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('file:///etc/passwd')).toBeNull();
    expect(sanitizeImageUrl('blob:https://sswanstudios.com/x')).toBeNull();
  });

  it('rejects protocol-relative // URLs', () => {
    expect(sanitizeImageUrl('//sswanstudios.com/a.png')).toBeNull();
  });

  // ── Rejection: off-allowlist origin ────────────────────────────────────
  it('rejects https URLs whose origin is not in the allowlist', () => {
    expect(sanitizeImageUrl('https://attacker.example/poison.png')).toBeNull();
    expect(sanitizeImageUrl('https://sswanstudios.evil.example/a.png')).toBeNull();
  });

  // ── Rejection: CSS-injection characters ────────────────────────────────
  it('rejects strings containing CSS-injection characters', () => {
    const samples = [
      'https://sswanstudios.com/a.png)',
      'https://sswanstudios.com/a.png(',
      'https://sswanstudios.com/a.png"',
      "https://sswanstudios.com/a.png'",
      'https://sswanstudios.com/a.png\\',
      'https://sswanstudios.com/<script>',
      'https://sswanstudios.com/a b.png', // whitespace
    ];
    for (const s of samples) {
      expect(sanitizeImageUrl(s), `should reject: ${s}`).toBeNull();
    }
  });

  // ── PHOTO_ORIGINS env override ─────────────────────────────────────────
  it('uses PHOTO_ORIGINS env when set (custom R2 domain)', () => {
    process.env.PHOTO_ORIGINS = 'https://photos.example.com,https://cdn.example.com';
    expect(sanitizeImageUrl('https://photos.example.com/a.png'))
      .toBe('https://photos.example.com/a.png');
    expect(sanitizeImageUrl('https://cdn.example.com/a.png'))
      .toBe('https://cdn.example.com/a.png');
    // Fallback origin is NOT included once override is set
    expect(sanitizeImageUrl('https://sswanstudios.com/a.png')).toBeNull();
  });

  it('strips trailing slashes when matching the env override', () => {
    process.env.PHOTO_ORIGINS = 'https://photos.example.com/, https://cdn.example.com/';
    expect(sanitizeImageUrl('https://photos.example.com/a.png'))
      .toBe('https://photos.example.com/a.png');
  });

  it('falls back to default origins when PHOTO_ORIGINS is empty or non-https-only', () => {
    process.env.PHOTO_ORIGINS = '';
    expect(sanitizeImageUrl('https://sswanstudios.com/a.png'))
      .toBe('https://sswanstudios.com/a.png');
    // PHOTO_ORIGINS containing only http (no https) → also falls back
    process.env.PHOTO_ORIGINS = 'http://insecure.example';
    expect(sanitizeImageUrl('https://sswanstudios.com/a.png'))
      .toBe('https://sswanstudios.com/a.png');
    expect(sanitizeImageUrl('http://insecure.example/a.png')).toBeNull();
  });

  // ── Canonicalizing semantics (Codex round-1 MEDIUM) ───────────────────
  // The function trims leading/trailing whitespace on success. Callers MUST
  // persist the return value rather than the original input — otherwise
  // whitespace survives into the DB even though the rules forbid it.
  it('returns the trimmed canonical form on success, NOT the original input', () => {
    const trimmed = sanitizeImageUrl('  https://sswanstudios.com/a.png  ');
    expect(trimmed).toBe('https://sswanstudios.com/a.png');
    expect(trimmed).not.toBe('  https://sswanstudios.com/a.png  ');
  });

  it('returns the same trimmed value for relative /uploads paths', () => {
    expect(sanitizeImageUrl('  /uploads/x.jpg  '))
      .toBe('/uploads/x.jpg');
  });
});
