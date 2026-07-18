/**
 * Store V4 — feature flag (KIMI-STORE-CORRECTED F2/Correction 3). Fail-closed, mirrors the shipped
 * Dashboards-v2 flag pattern. Resolution: runtime `/api/config/public-flags` (wins → instant revert
 * WITHOUT rebuild) → build-time env `VITE_STORE_V4` → **false** (renders StoreV3). A QA-only localStorage
 * override lets a reviewer preview without env/deploy. The store flag key was added to the existing
 * public-flags endpoint (no new flag system — the reground killed the assumed config/featureFlags.ts).
 */
import { useEffect, useState } from 'react';

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
    // Always consult the runtime flag so the central kill switch stays ABSOLUTE. An explicit runtime
    // `false` wins over the QA override (emergency-off must beat a reviewer's local toggle). The QA
    // override can only force V4 ON when the central switch hasn't deliberately killed it.
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { storeV4?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.storeV4 === 'boolean' ? Boolean(json.storeV4) : null;
        const override = qaOverride();
        let effective: boolean;
        if (runtime === false) effective = false; // kill switch absolute
        else if (override !== null) effective = override; // reviewer preview
        else effective = runtime ?? ENV_FALLBACK;
        setStoreV4(effective);
        setResolved(true);
      })
      .catch(() => {
        // runtime unreachable → the QA override may preview, else fail-closed env fallback
        if (alive) {
          setStoreV4(qaOverride() ?? ENV_FALLBACK);
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { storeV4, resolved };
}
