/**
 * Gallery vNext — feature flag (mirrors the shipped Store-V4 / Dashboards-v2 pattern). Fail-closed.
 * Resolution: runtime `/api/config/public-flags` (wins → instant revert WITHOUT rebuild) → build-time
 * env `VITE_GALLERY_VNEXT` → **false** (renders the current GalleryPage). A QA-only localStorage override
 * lets a reviewer preview without env/deploy. The `galleryVNext` key is added to the existing public-flags
 * endpoint (no new flag system). Billing-critical surface: runtime `false` is an ABSOLUTE kill switch.
 */
import { useEffect, useState } from 'react';
import { previewOverride } from '../../config/previewFlags';

/**
 * Entry-URL search params, captured at ROUTE-CHUNK evaluation — before ANY component mounts. The gate
 * renders the old GalleryPage during flag resolution and StrictMode double-mounts in dev; both strip the
 * checkout-return params (?credits/?donation/?print) before the lazy vNext evaluates, eating its toast
 * (Kimi probe P3). This module is imported by GalleryGate, so it evaluates first and preserves them.
 */
export const ENTRY_SEARCH = typeof window !== 'undefined' ? window.location.search : '';

const envBool = (value: unknown): boolean => value === 'true' || value === true;

const ENV_FALLBACK = envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_GALLERY_VNEXT);

/** QA override: `localStorage.ff_galleryVNext = '1'` forces vNext on for the local reviewer only. */
function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_galleryVNext');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

export function useGalleryVNextFlag(): { galleryVNext: boolean; resolved: boolean } {
  const [galleryVNext, setGalleryVNext] = useState<boolean>(ENV_FALLBACK); // fail-closed until resolved
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    // Runtime flag is authoritative: when the endpoint answers with a boolean it WINS (kill switch absolute —
    // an explicit false always closes). The QA override only previews when runtime is absent (key missing);
    // a fetch failure fails closed to env (the override cannot bypass an unreachable kill switch).
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error('public-flags unavailable'); return r.json(); })
      .then((json: { galleryVNext?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.galleryVNext === 'boolean' ? Boolean(json.galleryVNext) : null;
        // runtime present (true/false) WINS — kill switch absolute; override/env only when runtime is absent.
        const effective = previewOverride('galleryVNext') || (runtime !== null ? runtime : (qaOverride() ?? ENV_FALLBACK));
        setGalleryVNext(effective);
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setGalleryVNext(ENV_FALLBACK); // endpoint unreachable → fail-closed; override cannot bypass the kill
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { galleryVNext, resolved };
}
