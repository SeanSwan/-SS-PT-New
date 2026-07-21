/**
 * Home V-next — feature flag. Mirrors the shipped Store/Dashboards pattern. Resolution: runtime
 * `/api/config/public-flags.homeVNext` (wins → instant revert, no rebuild) → build-time `VITE_HOME_VNEXT`
 * → **false** (renders the current HomePage.V4). An explicit runtime `false` is a kill switch (absolute ONLY while the build env stays false — an unreachable flags endpoint falls back to env)
 * over the QA `localStorage.ff_homeVNext` override (that exact bug was caught on Store).
 */
import { useEffect, useState } from 'react';
import { previewOverride } from '../../../config/previewFlags';

const envBool = (value: unknown): boolean => value === 'true' || value === true;
const ENV_FALLBACK = envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_HOME_VNEXT);

function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_homeVNext');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

export function useHomeVNextFlag(): { homeVNext: boolean; resolved: boolean } {
  const [homeVNext, setHomeVNext] = useState<boolean>(ENV_FALLBACK); // fail-closed until resolved
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error('public-flags unavailable'); return r.json(); })
      .then((json: { homeVNext?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.homeVNext === 'boolean' ? Boolean(json.homeVNext) : null;
        // runtime present (true/false) WINS — kill switch absolute; override/env only when runtime is absent.
        const effective = previewOverride('homeVNext') || (runtime !== null ? runtime : (qaOverride() ?? ENV_FALLBACK));
        setHomeVNext(effective);
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setHomeVNext(ENV_FALLBACK); // endpoint unreachable → ENV_FALLBACK (fail-closed ONLY while the build env VITE_*_VNEXT is unset/false)
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { homeVNext, resolved };
}
