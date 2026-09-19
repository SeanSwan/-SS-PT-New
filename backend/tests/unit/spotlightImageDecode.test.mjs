/**
 * spotlightImageFetch — decode guards and the route's single entry point
 * ======================================================================
 * `decodeSpotlightImage` is where a URL that passed every network control is finally
 * proved to be a still raster image. Three controls, none of them cosmetic:
 *   1. magic-byte sniffing — the declared Content-Type is never consulted;
 *   2. a bounded `sharp` decode — a polyglot that sniffs as PNG dies here;
 *   3. re-encode — strips EXIF (including GPS; this is a fitness app) and guarantees the
 *      stored bytes are bytes we produced.
 *
 * Fetch-side controls live in `spotlightImageFetch.test.mjs`; fixtures in
 * `tests/helpers/spotlightImageFixtures.mjs`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import sharp from 'sharp';
import {
  SpotlightImageError,
  decodeSpotlightImage,
  fetchAndDecodeSpotlightImage,
} from '../../services/spotlightImageFetch.mjs';
import {
  PUBLIC_IP,
  mockDns,
  streamResponse,
  pngBuffer,
  jpegBuffer,
  alphaPngBuffer,
  animatedGifBuffer,
} from '../helpers/spotlightImageFixtures.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── decodeSpotlightImage ─────────────────────────────────────────────────
describe('decodeSpotlightImage', () => {
  // There are TWO independent gates against a non-image, and they fire for different
  // inputs. Pinning the message as well as the code is what proves which one fired:
  //   - SVG has no entry in FILE_SIGNATURES, so it dies at the sniff gate.
  //   - mp4/webm/avi/pdf DO sniff, and die at the RASTER_EXT allowlist instead.
  // If someone later adds `svg` to FILE_SIGNATURES (a plausible feature request), the
  // SVG test below would still pass — because RASTER_EXT would then be the gate that
  // catches it. The pdf test is the one that pins that second gate.
  it('rejects SVG, which is executable markup rather than a raster image', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(decodeSpotlightImage(svg)).rejects.toBeInstanceOf(SpotlightImageError);
    await expect(decodeSpotlightImage(svg)).rejects.toMatchObject({
      code: 'IMAGE_TYPE_REJECTED',
      message: expect.stringContaining('no accepted image signature'),
    });
  });

  it('rejects bytes that sniff as PNG but do not decode (polyglot)', async () => {
    const fake = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64, 0x41),
    ]);
    await expect(decodeSpotlightImage(fake)).rejects.toMatchObject({ code: 'IMAGE_DECODE_FAILED' });
  });

  it('rejects a non-raster type that sniffFileType recognises elsewhere', async () => {
    const pdf = Buffer.from('%PDF-1.7\n% garbage padding to clear the 12-byte floor\n');
    await expect(decodeSpotlightImage(pdf)).rejects.toMatchObject({
      code: 'IMAGE_TYPE_REJECTED',
      message: expect.stringContaining('not a raster image: pdf'),
    });
  });

  it('rejects an animated image', async () => {
    await expect(decodeSpotlightImage(animatedGifBuffer()))
      .rejects.toMatchObject({ code: 'IMAGE_ANIMATION_REJECTED' });
  });

  it('rejects an empty buffer', async () => {
    await expect(decodeSpotlightImage(Buffer.alloc(0))).rejects.toMatchObject({ code: 'IMAGE_EMPTY' });
  });

  // The codec is chosen from `metadata.hasAlpha`, not from the input container. An
  // opaque PNG carries nothing an alpha channel would preserve, so it is normalised to
  // JPEG; a transparent one must stay PNG or the transparency is flattened to black.
  it('normalises an opaque PNG to JPEG', async () => {
    const out = await decodeSpotlightImage(await pngBuffer());
    expect(out.contentType).toBe('image/jpeg');
    expect(out.ext).toBe('jpg');
    const meta = await sharp(out.buffer).metadata();
    expect(meta.format).toBe('jpeg');
  });

  it('keeps a transparent PNG as PNG so alpha survives the re-encode', async () => {
    const out = await decodeSpotlightImage(await alphaPngBuffer());
    expect(out.contentType).toBe('image/png');
    expect(out.ext).toBe('png');
    const meta = await sharp(out.buffer).metadata();
    expect(meta.format).toBe('png');
    expect(meta.hasAlpha).toBe(true);
  });

  it('re-encodes a JPEG without alpha to JPEG', async () => {
    const out = await decodeSpotlightImage(await jpegBuffer());
    expect(out.contentType).toBe('image/jpeg');
    expect(out.ext).toBe('jpg');
  });

  it('strips EXIF metadata from the stored artefact', async () => {
    const withExif = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .withMetadata({ exif: { IFD0: { Copyright: 'should-not-survive' } } })
      .jpeg()
      .toBuffer();

    const before = await sharp(withExif).metadata();
    expect(before.exif).toBeTruthy(); // the fixture really does carry EXIF

    const out = await decodeSpotlightImage(withExif);
    const after = await sharp(out.buffer).metadata();
    expect(after.exif).toBeUndefined();
  });

  it('caps the stored long edge', async () => {
    const wide = await sharp({
      create: { width: 3000, height: 1000, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer();
    const out = await decodeSpotlightImage(wide);
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(1600);
    expect(meta.height).toBeLessThanOrEqual(1600);
  });
});

// ─── fetchAndDecodeSpotlightImage (the route's single entry point) ─────────
describe('fetchAndDecodeSpotlightImage', () => {
  it('never throws — a blocked host becomes a value', async () => {
    mockDns([{ address: '127.0.0.1', family: 4 }]);
    const result = await fetchAndDecodeSpotlightImage('https://internal.example/a.png');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_URL_NOT_ALLOWED');
  });

  it('returns a re-encoded image on the happy path', async () => {
    mockDns(PUBLIC_IP);
    const payload = await alphaPngBuffer();
    const fetchImpl = vi.fn().mockResolvedValue(
      streamResponse([payload], { headers: { 'content-type': 'image/png' } })
    );
    const result = await fetchAndDecodeSpotlightImage('https://example.com/a.png', { fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.ext).toBe('png');
    expect(result.contentType).toBe('image/png');
    // The upstream Content-Type is reported but never trusted — the type is sniffed.
    expect(result.sourceContentType).toBe('image/png');
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
  });

  it('ignores a lying upstream Content-Type and sniffs the real bytes', async () => {
    mockDns(PUBLIC_IP);
    const payload = await jpegBuffer();
    const fetchImpl = vi.fn().mockResolvedValue(
      streamResponse([payload], { headers: { 'content-type': 'image/png' } })
    );
    const result = await fetchAndDecodeSpotlightImage('https://example.com/a.png', { fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.ext).toBe('jpg'); // sniffed from magic bytes, not from the header
  });
});
