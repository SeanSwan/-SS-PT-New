import logger from '../utils/logger.mjs';
import { fetchAndDecodeSpotlightImage } from './spotlightImageFetch.mjs';

/**
 * Re-host a SwanGuard image into SwanStudios' own R2 bucket.
 * Returns null on any failure — the caller renders a text-only card (blueprint ban #4:
 * never hot-link SwanGuard's URL in a production render path).
 *
 * MOVED HERE 2026-09-20 from `routes/bridge/bridgeIngestRoutes.mjs`, unchanged. The move was
 * forced, not opportunistic: R1's D1/D3 remediation pushed that route to 306 lines against
 * `06-bans.md` #50 ("no source file reaches 300 lines"), and this is the only self-contained
 * block in it that is I/O rather than routing. No behaviour changed in the move.
 *
 * HARDENED 2026-09-19, and two real defects were fixed here rather than one.
 *
 * (a) SSRF. The old version checked the protocol of the URL it was HANDED and then
 *     called fetch with defaults — which follows redirects. A host returning
 *     `302 → http://169.254.169.254/...` therefore defeated the check completely,
 *     because the protocol was only ever inspected on the first hop. It also applied
 *     its size cap AFTER `arrayBuffer()` had buffered the entire body, so the cap
 *     bounded what was stored, not what was consumed. `fetchAndDecodeSpotlightImage`
 *     now owns validation, the no-redirect fetch, the streamed cap, and the decode.
 *
 * (b) A wrong import. `uploadPhoto` was destructured from `r2StorageService.mjs`,
 *     which does not export it — it lives in `photoStorageService.mjs`. Every call
 *     threw `TypeError: uploadPhoto is not a function`, and this function's own
 *     catch reported it as a non-fatal degradation and returned null. So image
 *     re-hosting has never once succeeded, and the design ("a broken image degrades
 *     to a text-only card") is precisely what made that invisible. Verified by
 *     runtime introspection: `r2StorageService.uploadPhoto === undefined`.
 *
 * (c) The storage discriminator was discarded. Fixed 2026-09-20 (hostile review D7 / R2-02).
 *     `uploadPhoto` catches an R2 failure and falls through to local disk, returning
 *     `storage: 'local'` — and this function returned `result.url` regardless, so a disk path was
 *     stored as a completed R2 re-host. Only `storage === 'r2'` is accepted now. Note that (b) and
 *     (c) hid behind the SAME mechanism: a total failure and a partial one were both just "no
 *     image", which is why the failure contract kept them invisible.
 */
export async function rehostBridgeSpotlightImage(url, itemId) {
  try {
    const decoded = await fetchAndDecodeSpotlightImage(url);
    if (!decoded.ok) {
      logger.warn(`Spotlight image for ${itemId} not re-hosted (${decoded.code}): ${decoded.message}`);
      return null;
    }

    // `uploadPhoto` is the single choke point for every upload caller and re-sniffs the
    // bytes itself, deriving the stored extension and Content-Type from them rather than
    // from anything this call declares.
    const { uploadPhoto } = await import('./photoStorageService.mjs');
    const result = await uploadPhoto(decoded.buffer, {
      userId: 0,
      category: 'swan-spotlight',
      originalFilename: `${itemId}.${decoded.ext}`,
      contentType: decoded.contentType
    });

    // R2 ONLY — the storage discriminator is the answer, not the presence of a URL.
    //
    // `uploadPhoto` catches an R2 failure and SILENTLY falls through to local disk
    // (`photoStorageService.mjs:180-184`), returning `{ url, storage: 'local' }` at `:197`.
    // The old `return result?.url ?? null` therefore stored a disk path as a COMPLETED re-host,
    // which is the exact claim ban #4 exists to prevent — and the path it stored would be served
    // from a filesystem that does not survive a redeploy, so the card would render a broken image
    // on the next deploy while the row still asserted a successful re-host.
    //
    // The discriminator already existed and was being thrown away (hostile review D7 / R2-02).
    // Degrading to `null` is the correct outcome: ban #37 says a broken image becomes a text-only
    // card, and this is a broken image in the only sense that matters — we do not have it.
    if (result?.storage !== 'r2') {
      logger.warn(
        `Spotlight image for ${itemId} not re-hosted: storage='${result?.storage ?? 'none'}' (R2 required)`
      );
      return null;
    }
    return result.url;
  } catch (error) {
    logger.warn(`Spotlight image re-host failed for ${itemId} (non-fatal): ${error?.message}`);
    return null;
  }
}
