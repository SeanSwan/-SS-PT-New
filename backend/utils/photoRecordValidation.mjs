/**
 * ============================================================================
 * FILE: backend/utils/photoRecordValidation.mjs
 * PURPOSE: Bind a client-supplied progress-photo storageKey + url to the
 *          authorized owner. SWA-129 Kimi upload audit RANK-1/RANK-2 (CRITICAL).
 * ============================================================================
 *
 * The `POST /api/photos/:userId` record endpoint accepted `url` and `storageKey`
 * verbatim from the request body after only an ensureClientAccess check on the
 * ROW. But the row is a POINTER: an authorized client could store a record
 * pointing at ANOTHER user's (a minor's) R2 object — IDOR-by-key — or at an
 * arbitrary external URL (stored phishing / XSS-on-view / SSRF-on-fetch).
 *
 * The canonical key scheme (photoStorageService.uploadPhoto) is:
 *     photos/{category}/{userId}/{yearMonth}/{uuid}.{ext}
 * so the owner is path segment index 2. We bind the key to the authorized
 * client and constrain the url to the R2 public origin or a same-origin proxy
 * path. Anything else is rejected — fail closed. This does not replace the
 * proper presign-flow refactor (flagged on SWA-129) but it closes the live IDOR.
 */

// Read lazily at call time (not module-load): env may be configured after
// import, and it makes the guard testable without module-cache gymnastics.
const getR2PublicUrl = () => process.env.R2_PUBLIC_URL;

/** Reject keys with traversal / encoding tricks / absolute or empty segments. */
function hasUnsafeSegments(key) {
  if (typeof key !== 'string' || key.length === 0 || key.length > 500) return true;
  if (key.startsWith('/')) return true;
  const lowered = key.toLowerCase();
  if (lowered.includes('..') || lowered.includes('%2e') || lowered.includes('%2f') || lowered.includes('\\')) return true;
  return false;
}

/**
 * True only when `storageKey` is a canonical R2 photo key owned by `clientId`:
 *   photos/{category}/{clientId}/{...}
 * @param {string} storageKey
 * @param {number|string} clientId
 */
export function isOwnedPhotoStorageKey(storageKey, clientId) {
  if (hasUnsafeSegments(storageKey)) return false;
  const parts = storageKey.split('/');
  // photos / category / userId / yearMonth / file  (>=4 segments)
  if (parts.length < 4) return false;
  if (parts[0] !== 'photos') return false;
  if (parts.some((p) => p.length === 0)) return false;
  return String(parts[2]) === String(clientId);
}

/**
 * True only when `url` is safe to store: the configured R2 public origin
 * pointing at THIS client's key prefix, or a same-origin relative proxy path.
 * External hosts and dangerous schemes (javascript:/data:/file:) are rejected.
 * @param {string} url
 * @param {number|string} clientId
 * @param {string} storageKey  the already-validated owned key
 */
export function isSafePhotoUrl(url, clientId, storageKey) {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false;

  // Same-origin relative proxy/local path (server-issued): must reference the
  // owned key and carry no scheme or host.
  if (url.startsWith('/')) {
    if (url.startsWith('//')) return false; // protocol-relative → external
    return url.includes(String(storageKey)) || url.includes(`/${clientId}/`);
  }

  // Absolute URL: only the configured R2 public origin, https, no creds/IP,
  // and the path must be exactly this client's owned key.
  const r2PublicUrl = getR2PublicUrl();
  if (!r2PublicUrl) return false; // no public origin configured → reject absolute
  let parsed;
  let base;
  try {
    parsed = new URL(url);
    base = new URL(r2PublicUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.hostname !== base.hostname) return false;
  const path = parsed.pathname.replace(/^\/+/, '');
  return path === storageKey && isOwnedPhotoStorageKey(path, clientId);
}

const SERVE_PHOTO_PREFIX = '/api/serve-photo/';

/**
 * Parse a stored/served measurement photo path of the canonical shape
 *   /api/serve-photo/photos/{category}/{ownerId}/{...}
 * (the exact shape photoUrlSigner signs). Returns { key, category, ownerId }
 * or null if it is not a well-formed, traversal-free, internal serve-photo path.
 * External URLs, dangerous schemes (javascript:/data:/file:), protocol-relative
 * URLs, and traversal all fail to parse → null.
 * @param {unknown} entry
 */
export function parseServePhotoPath(entry) {
  if (typeof entry !== 'string' || entry.length === 0 || entry.length > 2048) return null;
  const bare = entry.split('?')[0];
  if (!bare.startsWith(SERVE_PHOTO_PREFIX)) return null;
  const key = bare.slice(SERVE_PHOTO_PREFIX.length); // photos/{category}/{ownerId}/...
  if (!key.startsWith('photos/')) return null;
  if (hasUnsafeSegments(key)) return null;
  const parts = key.split('/');
  if (parts.length < 4) return null;
  if (parts.some((p) => p.length === 0)) return null;
  if (!/^\d+$/.test(parts[2])) return null; // owner segment must be a bare integer id
  return { key, category: parts[1], ownerId: parts[2] };
}

/**
 * SWA-129 (Kimi call 5, IDOR-by-path + arbitrary-URL): the measurement
 * `photoUrls[]` array was persisted verbatim (stripPhotoSignatures only removes
 * `?exp&sig`). Because photoUrlSigner HMAC-signs ANY `.../photos/measurements/{id}/...`
 * path on read, a caller could store a path pointing at ANOTHER user's (a
 * minor's) measurement photo and read it back signed — or store an external /
 * javascript: URL that renders in the trainer/admin dashboard.
 *
 * A submitted entry is allowed iff it is a well-formed owned serve-photo path
 * whose owner segment equals the uploader (`req.user.id`), OR it is already
 * present in the measurement's stored list (so multi-editor re-submits of
 * existing photos are not broken). Everything else is rejected — fail closed.
 *
 * @param {unknown} photoUrls
 * @param {{ uploaderId: number|string, existing?: unknown[] }} ctx
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateMeasurementPhotoUrls(photoUrls, { uploaderId, existing = [] } = {}) {
  if (photoUrls === undefined || photoUrls === null) return { ok: true };
  if (!Array.isArray(photoUrls)) return { ok: false, message: 'photoUrls must be an array' };
  if (photoUrls.length > 20) return { ok: false, message: 'Too many photos (max 20)' };
  const existingBare = new Set(
    (Array.isArray(existing) ? existing : [])
      .filter((e) => typeof e === 'string')
      .map((e) => e.split('?')[0]),
  );
  for (const entry of photoUrls) {
    const bare = typeof entry === 'string' ? entry.split('?')[0] : entry;
    if (typeof bare === 'string' && existingBare.has(bare)) continue; // already stored → preserve
    const parsed = parseServePhotoPath(entry);
    if (!parsed) {
      return { ok: false, message: 'photoUrls contains a value that is not a valid measurement photo path' };
    }
    if (String(parsed.ownerId) !== String(uploaderId)) {
      return { ok: false, message: 'photoUrls references a photo not owned by the uploader' };
    }
  }
  return { ok: true };
}

/**
 * Validate a photo record submission. Returns { ok } or { ok:false, message }.
 */
export function validatePhotoRecord({ url, storageKey, clientId }) {
  if (!url || !storageKey) {
    return { ok: false, message: 'URL and storageKey are required' };
  }
  if (!isOwnedPhotoStorageKey(storageKey, clientId)) {
    return { ok: false, message: 'storageKey does not belong to this user or is malformed' };
  }
  if (!isSafePhotoUrl(url, clientId, storageKey)) {
    return { ok: false, message: 'url is not a permitted storage location' };
  }
  return { ok: true };
}
