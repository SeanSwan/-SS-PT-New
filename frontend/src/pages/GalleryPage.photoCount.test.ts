/**
 * GalleryPage.photoCount.test.ts
 * ==============================
 * Regression for the "1 photos" plural bug on the event cover badge.
 */
import { describe, it, expect } from 'vitest';
import { formatPhotoCount } from './galleryFormat';

describe('formatPhotoCount', () => {
  it('singular for exactly one', () => {
    expect(formatPhotoCount(1)).toBe('1 photo');
  });
  it('plural for zero and many', () => {
    expect(formatPhotoCount(0)).toBe('0 photos');
    expect(formatPhotoCount(2)).toBe('2 photos');
    expect(formatPhotoCount(47)).toBe('47 photos');
  });
});
