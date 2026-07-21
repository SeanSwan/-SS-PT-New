/**
 * Store V4 — feature flag (KIMI-STORE-CORRECTED F2/Correction 3). Fail-closed, mirrors the shipped
 * Dashboards-v2 flag pattern. Resolution: runtime `/api/config/public-flags` (wins → instant revert
 * WITHOUT rebuild) → build-time env `VITE_STORE_V4` → **false** (renders StoreV3). A QA-only localStorage
 * override lets a reviewer preview without env/deploy. The store flag key was added to the existing
 * public-flags endpoint (no new flag system — the reground killed the assumed config/featureFlags.ts).
 */
import { useEffect, useState } from 'react';
import { previewOverride } from '../../../config/previewFlags';

const envBool = (value: unknown): boolean => value === 'true' || value === true;

const ENV_FALLBACK = envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_STORE_V4);

/** QA override: `localStorage.ff_storeV4 = '1'` forces V4 on for the local reviewer only. */
function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_storeV4');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

export function useStoreV4Flag(): { storeV4: boolean; resolved: boolean } {
  const [storeV4, setStoreV4] = useState<boolean>(ENV_FALLBACK); // fail-closed until resolved
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    // Runtime flag is authoritative: when the endpoint answers with a boolean it WINS (kill switch absolute —
    // an explicit false always closes). The QA override only previews when runtime is absent (key missing);
    // a fetch failure fails closed to env (the override cannot bypass an unreachable kill switch).
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error('public-flags unavailable'); return r.json(); })
      .then((json: { storeV4?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.storeV4 === 'boolean' ? Boolean(json.storeV4) : null;
        // runtime present (true/false) WINS — kill switch absolute; override/env only when runtime is absent.
        const effective = previewOverride('storeV4') || (runtime !== null ? runtime : (qaOverride() ?? ENV_FALLBACK));
        setStoreV4(effective);
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setStoreV4(ENV_FALLBACK); // endpoint unreachable → ENV_FALLBACK (fail-closed ONLY while the build env VITE_*_VNEXT is unset/false)
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { storeV4, resolved };
}
