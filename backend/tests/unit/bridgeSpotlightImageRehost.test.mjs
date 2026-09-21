/**
 * bridgeSpotlightImageRehost — the R2-only storage discriminator
 * =============================================================
 * Hostile review D7 / R2-02. `uploadPhoto` catches an R2 failure and falls through to local
 * disk (`photoStorageService.mjs:180-184`), returning `storage: 'local'` at `:197`. The old
 * `return result?.url ?? null` therefore stored a DISK path as a COMPLETED re-host — which is
 * the claim blueprint ban #4 exists to prevent, and the stored URL would 404 after the next
 * deploy while the row still asserted success.
 *
 * The discriminator already existed and was being discarded. These tests pin that it is now
 * consulted, and that every failure stays a degradation (`null`) rather than a throw, because
 * ban #37 says a broken image becomes a text-only card and never a failed ingest.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockFetchDecode, mockUploadPhoto } = vi.hoisted(() => ({
  mockFetchDecode: vi.fn(),
  mockUploadPhoto: vi.fn(),
}));

vi.mock('../../services/spotlightImageFetch.mjs', () => ({
  fetchAndDecodeSpotlightImage: mockFetchDecode,
}));

vi.mock('../../services/photoStorageService.mjs', () => ({
  uploadPhoto: mockUploadPhoto,
}));

const { rehostBridgeSpotlightImage } =
  await import('../../services/bridgeSpotlightImageRehost.mjs');

const DECODED_OK = {
  ok: true,
  buffer: Buffer.from([1, 2, 3]),
  ext: 'jpg',
  contentType: 'image/jpeg',
};

beforeEach(() => {
  mockFetchDecode.mockReset();
  mockUploadPhoto.mockReset();
  mockFetchDecode.mockResolvedValue(DECODED_OK);
});

describe('rehostBridgeSpotlightImage — R2-only storage discriminator (D7)', () => {
  it('returns the URL when the upload really landed in R2', async () => {
    mockUploadPhoto.mockResolvedValue({
      url: 'https://cdn.example/x.jpg',
      storageKey: 'x.jpg',
      storage: 'r2',
    });
    await expect(rehostBridgeSpotlightImage('https://pub.example/a.jpg', 'item-1'))
      .resolves.toBe('https://cdn.example/x.jpg');
  });

  it('returns null when the upload fell back to local disk', async () => {
    // THE D7 CASE. The old code returned the disk URL and reported a successful re-host.
    mockUploadPhoto.mockResolvedValue({
      url: '/uploads/swan-spotlight/123.jpg',
      storageKey: '/uploads/swan-spotlight/123.jpg',
      storage: 'local',
    });
    await expect(rehostBridgeSpotlightImage('https://pub.example/a.jpg', 'item-2'))
      .resolves.toBeNull();
  });

  it('CONTROL: the disk URL is genuinely present on the result', async () => {
    // Proves the test above is not passing because `url` happened to be absent. It IS present —
    // the discriminator is what rejects it. Without this, the D7 case would be vacuous.
    const disk = {
      url: '/uploads/swan-spotlight/123.jpg',
      storageKey: '/uploads/swan-spotlight/123.jpg',
      storage: 'local',
    };
    mockUploadPhoto.mockResolvedValue(disk);
    const out = await rehostBridgeSpotlightImage('https://pub.example/a.jpg', 'item-2b');
    expect(disk.url).toBeTruthy();
    expect(out).toBeNull();
  });

  it('returns null when storage is missing entirely', async () => {
    mockUploadPhoto.mockResolvedValue({ url: 'https://cdn.example/x.jpg' });
    await expect(rehostBridgeSpotlightImage('https://pub.example/a.jpg', 'item-3'))
      .resolves.toBeNull();
  });

  it('degrades to null when uploadPhoto throws, rather than failing the ingest', async () => {
    mockUploadPhoto.mockRejectedValue(new Error('R2 down'));
    await expect(rehostBridgeSpotlightImage('https://pub.example/a.jpg', 'item-4'))
      .resolves.toBeNull();
  });

  it('degrades to null when the decode fails, and never uploads', async () => {
    mockFetchDecode.mockResolvedValue({
      ok: false,
      code: 'IMAGE_TOO_LARGE',
      message: 'too big',
    });
    await expect(rehostBridgeSpotlightImage('https://pub.example/a.jpg', 'item-5'))
      .resolves.toBeNull();
    expect(mockUploadPhoto).not.toHaveBeenCalled();
  });
});
