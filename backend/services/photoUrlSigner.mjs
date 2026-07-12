/**
 * photoUrlSigner.mjs — short-TTL HMAC signing for SENSITIVE photo proxy paths
 * ============================================================================
 * WHY: /api/serve-photo/* is intentionally unauthenticated (plain <img> tags
 * across the app can't send Authorization headers), but the `measurements`
 * category serves body/health photos — sensitive by design (Rule 62). A leaked
 * URL was permanently public. This module makes sensitive photo URLs expire:
 * API responses mint `?exp=<unix>&sig=<hmac>` variants and the proxy verifies
 * them before serving. Non-sensitive categories (profiles, social, products…)
 * stay public and untouched.
 *
 * CONTRACT:
 *  - The DB stores BARE paths only. Signing happens at RESPONSE time; writes
 *    must strip any signature params (stripPhotoSignature) so an accidentally
 *    persisted signed URL can never expire in storage.
 *  - FAIL-CLOSED: with no signing secret configured, verification always
 *    refuses (sensitive photos 401) rather than serving unprotected.
 *  - Signature covers `${path}:${exp}` with HMAC-SHA256; comparison is
 *    constant-time; expiry is checked server-side.
 *
 * Secret: PHOTO_URL_SIGNING_SECRET, falling back to JWT_SECRET (always set in
 * production — the boot guard enforces JWT_SECRET presence).
 */
import crypto from 'crypto';

export const SENSITIVE_PHOTO_CATEGORIES = new Set(['measurements']);

/** Default lifetime of a signed sensitive-photo URL. Long enough for a page
 * view + retries; short enough that a leaked link dies within the session. */
export const PHOTO_URL_TTL_SECONDS = 15 * 60;

const getSecret = () =>
  process.env.PHOTO_URL_SIGNING_SECRET || process.env.JWT_SECRET || null;

const hmacFor = (path, exp, secret) =>
  crypto.createHmac('sha256', secret).update(`${path}:${exp}`).digest('hex');

/** True when the given proxy path serves a sensitive category. Accepts either
 * a bare path or one with a query string. */
export function isSensitivePhotoPath(url) {
  if (typeof url !== 'string') return false;
  const path = url.split('?')[0];
  const match = path.match(/^\/api\/serve-photo\/photos\/([^/]+)\//);
  return match ? SENSITIVE_PHOTO_CATEGORIES.has(match[1]) : false;
}

/** Remove exp/sig params so only bare paths are ever persisted. */
export function stripPhotoSignature(url) {
  if (typeof url !== 'string') return url;
  const [path, query] = url.split('?');
  if (!query) return url;
  const params = new URLSearchParams(query);
  params.delete('exp');
  params.delete('sig');
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}

/**
 * Mint a signed variant of a sensitive proxy path. Non-sensitive or non-proxy
 * URLs pass through untouched. With no secret available, returns the bare
 * path (the proxy will refuse it — images break visibly instead of leaking).
 */
export function signPhotoPath(url, ttlSeconds = PHOTO_URL_TTL_SECONDS) {
  if (!isSensitivePhotoPath(url)) return url;
  const secret = getSecret();
  const path = stripPhotoSignature(url).split('?')[0];
  if (!secret) return path;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${path}?exp=${exp}&sig=${hmacFor(path, exp, secret)}`;
}

/** Sign every entry of a photoUrls array (null-safe). */
export function signPhotoUrls(urls, ttlSeconds = PHOTO_URL_TTL_SECONDS) {
  if (!Array.isArray(urls)) return urls;
  return urls.map((u) => signPhotoPath(u, ttlSeconds));
}

/** Strip signatures from every entry of an incoming photoUrls array. */
export function stripPhotoSignatures(urls) {
  if (!Array.isArray(urls)) return urls;
  return urls.map((u) => stripPhotoSignature(u));
}

/**
 * Verify a signed sensitive path. `path` must be the BARE proxy path (no
 * query). FAIL-CLOSED: missing secret, missing/malformed params, expiry in
 * the past, or signature mismatch all return false.
 */
export function verifySignedPhotoPath(path, exp, sig) {
  const secret = getSecret();
  if (!secret) return false;
  if (typeof path !== 'string' || typeof sig !== 'string') return false;
  const expNum = Number.parseInt(String(exp), 10);
  if (!Number.isFinite(expNum) || expNum <= Math.floor(Date.now() / 1000)) return false;
  const expected = hmacFor(path, expNum, secret);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(String(sig), 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    crypto.timingSafeEqual(expectedBuf, expectedBuf); // burn an equal-length compare
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}
