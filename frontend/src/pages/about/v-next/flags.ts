/**
 * About V-next — feature flag. Mirrors the shipped Home/Store/Dashboards pattern. Resolution: runtime
 * `/api/config/public-flags.aboutVNext` (wins → instant revert) → build-time `VITE_ABOUT_VNEXT` → **false**
 * (renders About.V4). An explicit runtime `false` is an ABSOLUTE kill switch over the QA `ff_aboutVNext`.
 */
import { useEffect, useState } from 'react';

const envBool = (value: unknown): boolean => value === 'true' || value === true;
const ENV_FALLBACK = envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_ABOUT_VNEXT);

function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_aboutVNext');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

export function useAboutVNextFlag(): { aboutVNext: boolean; resolved: boolean } {
  const [aboutVNext, setAboutVNext] = useState<boolean>(ENV_FALLBACK);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { aboutVNext?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.aboutVNext === 'boolean' ? Boolean(json.aboutVNext) : null;
        const override = qaOverride();
        let effective: boolean;
        if (runtime === false) effective = false;
        else if (override !== null) effective = override;
        else effective = runtime ?? ENV_FALLBACK;
        setAboutVNext(effective);
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setAboutVNext(qaOverride() ?? ENV_FALLBACK);
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { aboutVNext, resolved };
}
