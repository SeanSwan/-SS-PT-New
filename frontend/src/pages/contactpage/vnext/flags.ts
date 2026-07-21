/**
 * Contact V-next — feature flag. Mirrors the 6 shipped surfaces. Resolution: runtime
 * `/api/config/public-flags.contactVNext` (wins) → env `VITE_CONTACT_VNEXT` → **false** (renders ContactV3).
 * Explicit runtime `false` = ABSOLUTE kill switch over QA `ff_contactVNext`.
 */
import { useEffect, useState } from 'react';
import { previewOverride } from '../../../config/previewFlags';

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
      .then((r) => { if (!r.ok) throw new Error('public-flags unavailable'); return r.json(); })
      .then((json: { contactVNext?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.contactVNext === 'boolean' ? Boolean(json.contactVNext) : null;
        // runtime present (true/false) WINS — kill switch absolute; override/env only when runtime is absent.
        const effective = previewOverride('contactVNext') || (runtime !== null ? runtime : (qaOverride() ?? ENV_FALLBACK));
        setContactVNext(effective);
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setContactVNext(ENV_FALLBACK); // endpoint unreachable → fail-closed; override cannot bypass the kill
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { contactVNext, resolved };
}
