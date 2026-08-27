/**
 * stillThumbnail.mjs — the small picture a library page is actually made of.
 *
 * WHY THIS EXISTS
 *   The Assets library signed the ORIGINAL object for every card. A Compose still is a
 *   1920x1080 PNG — a couple of megabytes — and a page holds two dozen. `loading="lazy"`
 *   bounds how many are fetched, not what one costs, so scrolling a page fetched tens of
 *   megabytes to draw thumbnails a few hundred pixels wide. On a phone that is the
 *   difference between a library and a stall.
 *
 *   Note what the existing signer does NOT do: `generateThumbnailUrl` is a shorter TTL, not
 *   a smaller image. It signs the same bytes. Nothing in the stack was making a derivative,
 *   and the name made it look like something was.
 *
 * THE RULE THAT GOVERNS EVERYTHING HERE
 *   **A thumbnail is an optimisation, never a requirement.** A still whose derivative fails
 *   is still a saved asset — the bytes are in storage, the row exists, the work is not
 *   lost. Every failure path in this module returns null rather than throwing, and the
 *   caller records `posterR2Key: null` and moves on. Making a picture cheaper must never
 *   become a way to lose it.
 *
 * WHY WEBP AND WHY 512
 *   The largest card in the grid is a few hundred CSS pixels; 512 on the long edge covers
 *   it at 2x on a phone. WebP at q72 turns a ~2 MB PNG into ~30 KB, so a full page goes
 *   from tens of megabytes to under one. `withoutEnlargement` means a small source is
 *   passed through rather than blown up into a bigger file than the original.
 */

const MAX_EDGE = 512;
const QUALITY = 72;

/** Derived from the SAME hash as the original, so re-persisting a still cannot mint a
 *  second object. One still, one thumbnail, forever, addressed by content. */
export function thumbObjectKey({ userId, sha256: hash }) {
  return `atelier/stills/${userId}/thumbs/${hash}.webp`;
}

/**
 * Shrink image bytes, or say you could not.
 *
 * @returns `{ bytes, mime, width, height }` — or **null** when no thumbnail could be made,
 *          which is a normal outcome and never an error. The caller must treat null as
 *          "this asset has no derivative", not as a failure to report upward.
 */
export async function makeThumbnail(bytes, { maxEdge = MAX_EDGE, sharpImpl = null } = {}) {
  if (!bytes || !bytes.length) return null;
  let sharp = sharpImpl;
  if (!sharp) {
    // Imported lazily and defensively. sharp carries native binaries, and a platform where
    // they did not install must degrade to "no thumbnails" rather than take down every
    // render's persist step — which is exactly what a top-level import would do.
    try { ({ default: sharp } = await import('sharp')); } catch { return null; }
  }
  try {
    const out = await sharp(bytes)
      .rotate()                                     // honour EXIF before measuring anything
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });
    // A "thumbnail" larger than its source is not a thumbnail. Small PNGs and already-tiny
    // sources can encode bigger as WebP; shipping that would make the page heavier while
    // reporting a saving.
    if (out.data.length >= bytes.length) return null;
    return { bytes: out.data, mime: 'image/webp', width: out.info.width, height: out.info.height };
  } catch {
    return null;
  }
}
