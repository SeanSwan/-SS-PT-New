/**
 * Per-browser preview override for the two approved feature switches.
 *
 * The Launch Control page marks an admin browser with `swan_preview_ok`. A matching
 * `?swanpreview=prismCapture|postSaveHandoff` query may then override that feature for this browser only.
 * Runtime behavior for everyone else is unchanged. This convenience is not an authorization boundary, and
 * the runtime whitelist below rejects every retired design key even if it is manually placed in the URL.
 */
export const PREVIEW_OK_KEY = 'swan_preview_ok';

export type PreviewFeatureFlag = 'prismCapture' | 'postSaveHandoff';

const PREVIEWABLE_FEATURE_FLAGS: readonly PreviewFeatureFlag[] = ['prismCapture', 'postSaveHandoff'];

export function previewOverride(flagKey: PreviewFeatureFlag): boolean {
  if (!PREVIEWABLE_FEATURE_FLAGS.includes(flagKey)) return false;
  try {
    const preview = new URLSearchParams(window.location.search).get('swanpreview');
    if (!preview) return false;
    if (!preview.split(',').map((s) => s.trim()).includes(flagKey)) return false;
    return localStorage.getItem(PREVIEW_OK_KEY) === '1';
  } catch {
    return false; // SSR / privacy mode → no preview
  }
}
