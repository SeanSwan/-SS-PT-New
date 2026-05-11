/**
 * imageUrl — sanitizer unit tests
 * ===============================
 * 2026-05-10 SLICE 1: locks the contract sanitizeImageUrl() ships with.
 * Anchors the AI-Village CHAIN-1 (CRITICAL) defense — if any future change
 * weakens the rejection rules, these tests fail loudly.
 *
 * Origin allowlist: tests rely on the FALLBACK_ORIGINS path that fires
 * when VITE_PHOTO_ORIGINS is not set, so they exercise the production
 * default (`https://sswanstudios.com`, `https://cdn.sswanstudios.com`,
 * `https://www.sswanstudios.com`).
 */
import { describe, expect, it } from 'vitest';
import { sanitizeImageUrl, cssUrlValue } from './imageUrl';

describe('sanitizeImageUrl', () => {
  it('returns null for null/undefined/empty/whitespace', () => {
    expect(sanitizeImageUrl(null)).toBeNull();
    expect(sanitizeImageUrl(undefined)).toBeNull();
    expect(sanitizeImageUrl('')).toBeNull();
    expect(sanitizeImageUrl('   ')).toBeNull();
  });

  it('rejects javascript:/data:/file:/blob: protocols', () => {
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('data:text/html,<script>x</script>')).toBeNull();
    expect(sanitizeImageUrl('file:///etc/passwd')).toBeNull();
    expect(sanitizeImageUrl('blob:https://sswanstudios.com/abc')).toBeNull();
  });

  it('rejects CSS-injection characters even on allowlisted origins', () => {
    expect(sanitizeImageUrl('https://sswanstudios.com/x.png) url(evil')).toBeNull();
    expect(sanitizeImageUrl('https://sswanstudios.com/x"; evil')).toBeNull();
    expect(sanitizeImageUrl("https://sswanstudios.com/'evil")).toBeNull();
    expect(sanitizeImageUrl('https://sswanstudios.com/x\\evil')).toBeNull();
    expect(sanitizeImageUrl('https://sswanstudios.com/x with space')).toBeNull();
  });

  it('rejects http:// (only https:// is accepted on absolute URLs)', () => {
    expect(sanitizeImageUrl('http://sswanstudios.com/banner.jpg')).toBeNull();
  });

  it('rejects https:// origins outside the allowlist', () => {
    expect(sanitizeImageUrl('https://evil.example.com/banner.jpg')).toBeNull();
    expect(
      sanitizeImageUrl('https://sswanstudios.com.evil.example/banner.jpg'),
    ).toBeNull();
  });

  it('accepts allowlisted https origins verbatim', () => {
    const ok = 'https://sswanstudios.com/banners/u-42/abc.jpg';
    expect(sanitizeImageUrl(ok)).toBe(ok);
    const cdn = 'https://cdn.sswanstudios.com/banners/u-42/abc.webp';
    expect(sanitizeImageUrl(cdn)).toBe(cdn);
  });

  it('accepts root-relative paths (local-fallback uploads)', () => {
    expect(sanitizeImageUrl('/uploads/banners/abc.jpg')).toBe(
      '/uploads/banners/abc.jpg',
    );
  });

  it('rejects protocol-relative // URLs', () => {
    expect(sanitizeImageUrl('//sswanstudios.com/banner.jpg')).toBeNull();
  });

  it('rejects malformed absolute URLs', () => {
    expect(sanitizeImageUrl('https://')).toBeNull();
    expect(sanitizeImageUrl('not-a-url')).toBeNull();
  });
});

describe('cssUrlValue', () => {
  it('wraps the input in double quotes', () => {
    expect(cssUrlValue('/uploads/banners/x.jpg')).toBe('"/uploads/banners/x.jpg"');
  });

  it('strips backslashes and double-quotes defensively', () => {
    expect(cssUrlValue('/uploads/x"evil.jpg')).toBe('"/uploads/xevil.jpg"');
    expect(cssUrlValue('/uploads/x\\evil.jpg')).toBe('"/uploads/xevil.jpg"');
  });
});
