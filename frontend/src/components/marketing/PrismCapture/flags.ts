/**
 * PrismCapture — feature flag. Mirrors the shipped Home/Store pattern. Resolution: runtime
 * `/api/config/public-flags.prismCapture` (wins → instant revert, no rebuild) → build-time `VITE_PRISM_CAPTURE`
 * → **false** (renders nothing — the current hero is untouched). An explicit runtime `false` is an ABSOLUTE
 * kill switch over the QA `localStorage.ff_prismCapture` override.
 *
 * The `prismCapture` key IS registered in publicConfigRoutes (`= isTrue(PRISM_CAPTURE_ENABLED)`), so the runtime
 * kill switch is authoritative: with the env unset the endpoint returns `prismCapture:false` and this resolves
 * false regardless of build/QA override. To QA-preview before enabling the env, use `localStorage.ff_prismCapture`
 * — but note the runtime `false` will win once the value is present, so preview via the env/build in that case.
 *
 * The public-flags GET is memoized at module scope so repeated mounts of this hook share ONE request. (A single
 * repo-wide shared flags cache across all ~8 surface `flags.ts` files is a separate cross-cutting follow-up.)
 */
import { useEffect, useState } from 'react';
import { previewOverride } from '../../../config/previewFlags';

const envBool = (value: unknown): boolean => value === 'true' || value === true;
const ENV_FALLBACK = envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_PRISM_CAPTURE);

/** True when the build opted in (env). Lets the container reserve space during resolve to avoid CLS on enable. */
export const PRISM_ENV_FALLBACK = ENV_FALLBACK;

let flagsPromise: Promise<Record<string, unknown> | null> | null = null;
function fetchPublicFlags(): Promise<Record<string, unknown> | null> {
  if (!flagsPromise) {
    flagsPromise = fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('public-flags unavailable');
        return r.json();
      })
      .catch(() => {
        flagsPromise = null; // allow a later retry after a transient failure
        return null;
      });
  }
  return flagsPromise;
}

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
    fetchPublicFlags()
      .then((json) => {
        if (!alive) return;
        const runtime = json && typeof json.prismCapture === 'boolean' ? Boolean(json.prismCapture) : null;
        // runtime present (true/false) WINS — kill switch absolute; override/env only when runtime is absent.
        const effective = previewOverride('prismCapture') || (runtime !== null ? runtime : (qaOverride() ?? ENV_FALLBACK));
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
