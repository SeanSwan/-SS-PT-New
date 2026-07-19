/**
 * PrismCapture — feature flag. Mirrors the shipped Home/Store pattern. Resolution: runtime
 * `/api/config/public-flags.prismCapture` (wins → instant revert, no rebuild) → build-time `VITE_PRISM_CAPTURE`
 * → **false** (renders nothing — the current hero is untouched). An explicit runtime `false` is an ABSOLUTE
 * kill switch over the QA `localStorage.ff_prismCapture` override.
 *
 * NOTE: the `prismCapture` key is not yet registered in publicConfigRoutes (that file is held by the Gallery
 * agent — coordinate). Until it is, the runtime JSON omits the key → resolution falls to the QA override / env,
 * both of which default OFF. So PrismCapture is fully dark until BOTH the backend env and this flag are on.
 */
import { useEffect, useState } from 'react';

const envBool = (value: unknown): boolean => value === 'true' || value === true;
const ENV_FALLBACK = envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_PRISM_CAPTURE);

function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_prismCapture');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

export function usePrismCaptureFlag(): { prismCapture: boolean; resolved: boolean } {
  const [prismCapture, setPrismCapture] = useState<boolean>(ENV_FALLBACK); // fail-closed until resolved
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('public-flags unavailable');
        return r.json();
      })
      .then((json: { prismCapture?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.prismCapture === 'boolean' ? Boolean(json.prismCapture) : null;
        // runtime present (true/false) WINS — kill switch absolute; override/env only when runtime is absent.
        const effective = runtime !== null ? runtime : qaOverride() ?? ENV_FALLBACK;
        setPrismCapture(effective);
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setPrismCapture(ENV_FALLBACK); // endpoint unreachable → fail-closed
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { prismCapture, resolved };
}
