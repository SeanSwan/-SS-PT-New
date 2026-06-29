/**
 * imageUrl — sanitize remote image URLs before they land in CSS background()
 *
 * Background: backend/services/photoStorageService.mjs returns either:
 *   - https://<R2_PUBLIC_URL>/<objectKey>  (R2 mode)
 *   - /uploads/<...>                        (local fallback, dev only)
 *
 * On the frontend the URL flows: API response → React state → styled-component
 * prop → CSS template-literal interpolation `background: url(${value})`. That
 * raw interpolation is a CSS-injection vector if a user's bannerPhoto/photo
 * field was ever poisoned (compromised account, IDOR on a profile-update
 * endpoint, admin-panel breach). AI Village 15-brain run 2026-05-10 flagged
 * this as CHAIN-1 (CRITICAL).
 *
 * This module returns a value safe to inject into both `<img src>` and
 * `background: url("...")`. For CSS interpolation, callers MUST also wrap the
 * value in double quotes — see {@link cssUrlValue}.
 */

const FALLBACK_ORIGINS: readonly string[] = [
  'https://sswanstudios.com',
  'https://cdn.sswanstudios.com',
  'https://www.sswanstudios.com',
  // Documented R2 public-domain target per AI-Village-Documentation/
  // STORAGE-MIGRATION-PLAN.md ("Set R2_PUBLIC_URL — Create a custom domain
  // for your R2 bucket (e.g., media.sswanstudios.com)"). If a different
  // R2 custom domain is provisioned in production, add it via the
  // VITE_PHOTO_ORIGINS env var rather than mutating this fallback.
  'https://media.sswanstudios.com',
];

const TRUSTED_FEED_IMAGE_ORIGINS: readonly string[] = [
  'https://images-assets.nasa.gov',
  'https://images.nasa.gov',
  'https://upload.wikimedia.org',
  'https://www.nps.gov',
  'https://nps.gov',
  'https://ids.si.edu',
];

const readConfiguredOrigins = (): string[] => {
  const raw = import.meta.env.VITE_PHOTO_ORIGINS as string | undefined;
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.startsWith('https://'));
};

/**
 * Origin allowlist. VITE_PHOTO_ORIGINS can add deployment-specific media
 * origins; the Swan media origins and official feed image providers stay
 * trusted so enrichment cards can render their actual post media.
 */
const ALLOWED_ORIGINS: readonly string[] = Array.from(new Set([
  ...FALLBACK_ORIGINS,
  ...TRUSTED_FEED_IMAGE_ORIGINS,
  ...readConfiguredOrigins(),
]));

/** Reject any character that could escape a CSS `url(...)` token. */
const CSS_INJECTION_CHARS = /[()'"\\<>\s]/;

/**
 * Returns the input URL if it's safe to use as an image source / CSS
 * `background: url(...)` value, otherwise returns null.
 *
 * Safe inputs:
 *   - Relative paths starting with `/` (e.g. `/uploads/abc.jpg`)
 *   - Absolute https:// URLs whose origin is in ALLOWED_ORIGINS
 *
 * Always rejected: data:/javascript:/file:/blob: protocols, CSS-injection
 * characters, malformed URLs, null/undefined/empty.
 */
export function sanitizeImageUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (CSS_INJECTION_CHARS.test(trimmed)) return null;

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return null;
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const candidateOrigin = parsed.origin;
  if (!ALLOWED_ORIGINS.includes(candidateOrigin)) return null;
  return trimmed;
}

/**
 * Wrap a sanitized URL for safe interpolation into a CSS `background: url(...)`
 * declaration. Always double-quotes the value and escapes the (already
 * rejected) `\` and `"` defensively.
 */
export function cssUrlValue(safeUrl: string): string {
  return `"${safeUrl.replace(/\\/g, '').replace(/"/g, '')}"`;
}
