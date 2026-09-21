/**
 * Photo-serve category allowlist — the one place that decides which R2 namespaces
 * `/api/serve-photo/...` will serve.
 *
 * WHY THIS IS ITS OWN MODULE. The list used to live inline inside the route callback in
 * `core/routes.mjs`, which made it untestable: importing that file builds the whole Express
 * app. It is a security boundary — it decides which R2 keys are reachable through the proxy —
 * so it should be provable on its own rather than by reading it.
 *
 * WHY `swan-spotlight` IS HERE. `photoStorageService.uploadPhoto` builds
 * `photos/${category}/${userId}/${yearMonth}/${uuid}.${ext}` and, when `R2_PUBLIC_URL` is
 * unset, returns `/api/serve-photo/${objectKey}` rather than a bucket URL
 * (`photoStorageService.mjs:157, :174-176`). The Spotlight bridge re-hosts with
 * `category: 'swan-spotlight'`, `userId: 0` (`bridgeSpotlightImageRehost.mjs:51-56`), so every
 * re-hosted image produced the path `/api/serve-photo/photos/swan-spotlight/0/<ym>/<uuid>.<ext>`
 * — and this list did not contain the namespace, so the proxy answered **400 Invalid photo
 * path**. The upload succeeded, the row stored a URL, `storage` was `'r2'`, and the card could
 * not render: a stored image that 400s (hostile review R5-05). `R2_PUBLIC_URL` is set in none of
 * the six env/config files, so that branch is the live one, not a hypothetical.
 *
 * WHY IT IS STILL AN ALLOWLIST. The lazy fix — accepting any category, or any path under
 * `photos/` — would turn a namespace boundary into an open proxy over the bucket. Astra's own
 * review warned against exactly that. Namespaces are added explicitly, one at a time.
 *
 * To add one: append it here and extend `tests/unit/photoServeCategories.test.mjs` with the URL
 * shape the real uploader produces, not a hand-written path.
 */

/** R2 namespaces `/api/serve-photo/...` is permitted to serve. Exact match, case-sensitive. */
export const PHOTO_SERVE_CATEGORIES = Object.freeze([
  'profiles',
  'banners',
  'banner-collage',
  'measurements',
  'social',
  'social-photos',
  'social-videos',
  'products',
  'swan-spotlight',
]);

/**
 * True only for an exact, known namespace. Deliberately not a prefix or pattern match: a
 * `startsWith` here would let `profiles-backup` ride in on `profiles`.
 */
export const isServablePhotoCategory = (category) =>
  typeof category === 'string' && PHOTO_SERVE_CATEGORIES.includes(category);
