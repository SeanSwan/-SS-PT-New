/**
 * Preview-as (Launch Control R3). An admin opens a dark vNext from the Launch Control board via a
 * `?swanpreview=<flag>` link. When that param names THIS surface's flag and a session token is present,
 * the surface renders for THIS browser only:
 *  - the runtime kill switch still protects everyone else (preview is per-URL, not a global flip);
 *  - the surface Gate still fail-closes a broken vNext (preview doesn't bypass the contract probe);
 *  - it is NOT a secrecy boundary — the vNext is already deployed code. It's a convenience so a surface
 *    can be perfected privately before it is flipped on for real.
 *
 * Gate: the visitor's browser must carry the `swan_preview_ok` marker, which ONLY the admin-gated Launch
 * Control board sets (on mount). So a link only previews for someone who has opened Launch Control — a
 * random visitor who guesses `?swanpreview=` sees nothing. (Deliberately not tied to the auth token: the
 * app clears an invalid token during startup, which would make a token check flap.)
 *
 * Precedence: preview wins over runtime/localStorage/env when active, else returns false (no effect).
 */
export const PREVIEW_OK_KEY = 'swan_preview_ok';

export function previewOverride(flagKey: string): boolean {
  try {
    const preview = new URLSearchParams(window.location.search).get('swanpreview');
    if (!preview) return false;
    if (!preview.split(',').map((s) => s.trim()).includes(flagKey)) return false;
    return localStorage.getItem(PREVIEW_OK_KEY) === '1';
  } catch {
    return false; // SSR / privacy mode → no preview
  }
}
