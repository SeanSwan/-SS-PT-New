/**
 * imageUrl — server-side photo-URL allowlist for fields a user can write
 *
 * Companion to frontend/src/utils/imageUrl.ts. Both layers MUST reject the
 * same inputs so a URL that survives one boundary cannot bypass the other.
 *
 * Surface: PUT /api/profile + PATCH /api/client/profile both let a user set
 * `photo` directly. The dedicated POST upload endpoints get their URL from
 * photoStorageService server-side (trusted by construction). This module
 * gates the user-supplied write path.
 *
 * Rules (must match frontend imageUrl.ts):
 *   - Reject non-string / empty / whitespace-only
 *   - Reject CSS-injection characters: ( ) ' " \ < > whitespace
 *   - Accept relative paths starting with `/` (but NOT `//`) for local
 *     dev/fallback storage; accept https:// URLs whose origin is in
 *     ALLOWED_ORIGINS
 *   - Reject any other protocol (data:, javascript:, file:, blob:, http:)
 */

// Production R2_PUBLIC_URL = https://media.sswanstudios.com (also listed below),
// so URLs minted by photoStorageService round-trip cleanly through PUT /api/profile.
// If a future deploy changes R2_PUBLIC_URL to a different custom domain, also
// add that origin to the PHOTO_ORIGINS env var or this list — otherwise the
// server's own minted URLs would 400 on the next profile-update round-trip.
const FALLBACK_ORIGINS = Object.freeze([
  'https://sswanstudios.com',
  'https://www.sswanstudios.com',
  'https://cdn.sswanstudios.com',
  'https://media.sswanstudios.com',
]);

const buildAllowedOrigins = () => {
  const raw = process.env.PHOTO_ORIGINS;
  if (!raw || typeof raw !== 'string') return FALLBACK_ORIGINS;
  const parsed = raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.startsWith('https://'));
  return parsed.length > 0 ? Object.freeze(parsed) : FALLBACK_ORIGINS;
};

const CSS_INJECTION_CHARS = /[()'"\\<>\s]/;

/**
 * Returns the sanitized (leading/trailing whitespace-trimmed) URL if it's
 * safe for storage as a photo URL, otherwise returns `null`. Callers MUST
 * reject the write on null AND MUST persist the returned (trimmed) value,
 * not the original input — otherwise leading/trailing whitespace survives
 * into the DB even though the rules above forbid embedded whitespace.
 *
 * Reads PHOTO_ORIGINS from process.env on each call so a deploy env-var
 * change takes effect without re-importing the module.
 */
export function sanitizeImageUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (CSS_INJECTION_CHARS.test(trimmed)) return null;

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return null;
    return trimmed;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const allowed = buildAllowedOrigins();
  if (!allowed.includes(parsed.origin)) return null;
  return trimmed;
}
