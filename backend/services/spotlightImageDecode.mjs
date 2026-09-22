/**
 * spotlightImageDecode.mjs
 * ========================
 * PROVE THE BYTES ARE AN IMAGE, THEN RE-ENCODE THEM.
 *
 * WHY THIS FILE EXISTS. Extracted from `spotlightImageFetch.mjs` on 2026-09-21, when the
 * round-9 finding-2 fix (releasing the body on the mid-read error path, which added the one
 * comment that pushed that file to exactly 300 lines) breached `06-bans.md` #50. The seam was
 * already there and is the honest one: everything left in `spotlightImageFetch.mjs` is about
 * TRANSPORT — admission, the pinned socket, the read caps. Nothing here touches the network.
 *
 * `decodeSpotlightImage` is RE-EXPORTED from `spotlightImageFetch.mjs`, so every existing
 * importer and its tests are untouched by the move. That matters: the extraction was forced by
 * a line limit, and a line limit is not a reason to change anyone's import.
 */

import sharp from 'sharp';
import { sniffFileType } from './photoStorageService.mjs';
// The error type lives with the URL policy; importing it here does NOT create a cycle, because
// `spotlightImageUrlPolicy.mjs` never imports this file. The dependency runs one way:
// policy -> decode -> fetch, with fetch re-exporting both.
import { SpotlightImageError } from './spotlightImageUrlPolicy.mjs';

/** Reject an image whose decoded pixel count exceeds this. */
export const MAX_IMAGE_PIXELS = 16_000_000;

/** Longest edge of the stored artefact, in pixels. */
export const MAX_STORED_EDGE = 1600;

/** Raster formats we will store. `sniffFileType` also recognises mp4/webm/avi/pdf. */
const RASTER_EXT = new Set(['jpg', 'png', 'gif', 'webp', 'heic']);

/**
 * Prove the bytes really are a single-frame raster image, then re-encode them.
 *
 * Three things happen here, and each is a control rather than a tidy-up:
 *   1. `sniffFileType` reads the magic bytes. The declared Content-Type is
 *      attacker-controlled and is not consulted. SVG is not in the signature table, so
 *      it is rejected here — an SVG served from our own R2 domain is stored XSS.
 *   2. `sharp` decodes it. A file that sniffs as PNG but does not decode is a polyglot,
 *      and this is where it dies. `limitInputPixels` makes the decode itself bounded.
 *   3. Re-encode. Strips EXIF (including GPS — this is a fitness app), normalises the
 *      stored artefact, and guarantees the bytes we serve are bytes we produced.
 *
 * @param {Buffer} buffer raw bytes from the network
 * @param {{maxPixels?: number, maxEdge?: number}} [opts]
 * @returns {Promise<{buffer: Buffer, contentType: string, ext: string}>}
 * @throws {SpotlightImageError}
 */
export async function decodeSpotlightImage(buffer, opts = {}) {
  const { maxPixels = MAX_IMAGE_PIXELS, maxEdge = MAX_STORED_EDGE } = opts;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new SpotlightImageError('IMAGE_EMPTY', 'no bytes to decode');
  }

  const sniffed = sniffFileType(buffer);
  if (!sniffed) {
    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', 'bytes match no accepted image signature');
  }
  if (!RASTER_EXT.has(sniffed.ext)) {
    // sniffFileType also recognises mp4/webm/avi/pdf — valid uploads elsewhere, not here.
    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', `not a raster image: ${sniffed.ext}`);
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: maxPixels }).metadata();
  } catch (err) {
    throw new SpotlightImageError('IMAGE_DECODE_FAILED', err.message);
  }

  if (!metadata?.width || !metadata?.height) {
    throw new SpotlightImageError('IMAGE_DECODE_FAILED', 'no dimensions');
  }
  if (metadata.width * metadata.height > maxPixels) {
    throw new SpotlightImageError('IMAGE_TOO_LARGE', `${metadata.width}x${metadata.height} exceeds ${maxPixels} px`);
  }
  // An animated image is a frame budget, not an image. `pages` is 1 for stills.
  if (Number(metadata.pages) > 1) {
    throw new SpotlightImageError('IMAGE_ANIMATION_REJECTED', `${metadata.pages} frames`);
  }

  // Preserve alpha by choosing PNG; otherwise JPEG, which is far smaller for photographs.
  const pipeline = sharp(buffer, { limitInputPixels: maxPixels })
    .rotate() // bake EXIF orientation in before the metadata that carries it is dropped
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });

  const keepAlpha = Boolean(metadata.hasAlpha);
  const outBuffer = keepAlpha
    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
    : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();

  return {
    buffer: outBuffer,
    contentType: keepAlpha ? 'image/png' : 'image/jpeg',
    ext: keepAlpha ? 'png' : 'jpg',
  };
}
