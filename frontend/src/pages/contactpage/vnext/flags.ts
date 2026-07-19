/**
 * Contact V-next — feature flag. Mirrors the 6 shipped surfaces. Resolution: runtime
 * `/api/config/public-flags.contactVNext` (wins) → env `VITE_CONTACT_VNEXT` → **false** (renders ContactV3).
 * Explicit runtime `false` = ABSOLUTE kill switch over QA `ff_contactVNext`.
 */
import { useEffect, useState } from 'react';

const envBool = (value: unknown): boolean => value === 'true' || value === true;
const ENV_FALLBACK = envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_CONTACT_VNEXT);

function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_contactVNext');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

export function useContactVNextFlag(): { contactVNext: boolean; resolved: boolean } {
  const [contactVNext, setContactVNext] = useState<boolean>(ENV_FALLBACK);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { contactVNext?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.contactVNext === 'boolean' ? Boolean(json.contactVNext) : null;
        const override = qaOverride();
        let effective: boolean;
        if (runtime === false) effective = false;
        else if (override !== null) effective = override;
        else effective = runtime ?? ENV_FALLBACK;
        setContactVNext(effective);
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setContactVNext(qaOverride() ?? ENV_FALLBACK);
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { contactVNext, resolved };
}
