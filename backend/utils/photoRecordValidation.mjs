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
