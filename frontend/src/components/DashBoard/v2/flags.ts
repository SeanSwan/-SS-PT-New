/**
 * Dashboards v2 — feature flags (KIMI-DASHBOARDS-CORRECTED §0/§6.3). Fail-closed.
 *
 * Resolution order (aligned with the 5 newer surface hooks): runtime `/api/config/public-flags` (wins) →
 * QA localStorage override → build-time env → **false**. An explicit runtime `false` is an ABSOLUTE kill
 * switch over the QA override (emergency-off must beat a reviewer's local toggle). `finance` is ALSO enforced
 * server-side; the client value only hides UI (no QA override needed — it can never turn money on client-side).
 */
import { useEffect, useState } from 'react';
import { previewOverride } from '../../../config/previewFlags';

export interface DashboardV2Flags {
  v2: boolean;
  finance: boolean;
}

const envBool = (value: unknown): boolean => value === 'true' || value === true;

// Vite build-time env (import.meta.env.VITE_*); default false = fail-closed.
const ENV_FALLBACK: DashboardV2Flags = {
  v2: envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_DASHBOARD_V2),
  finance: envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_DASHBOARD_V2_FINANCE),
};

/** QA-only preview: `localStorage.ff_dashboardV2 = '1'` forces v2 on for the local reviewer (never finance). */
function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_dashboardV2');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

export function useDashboardV2Flags(): DashboardV2Flags & { resolved: boolean } {
  const [flags, setFlags] = useState<DashboardV2Flags>(ENV_FALLBACK);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error('public-flags unavailable'); return r.json(); })
      .then((json: { dashboardV2?: unknown; dashboardV2Finance?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.dashboardV2 === 'boolean' ? Boolean(json.dashboardV2) : null;
        // runtime present (true/false) WINS — kill switch absolute; override/env only when runtime is absent.
        const v2 = previewOverride('dashboardV2') || (runtime !== null ? runtime : (qaOverride() ?? ENV_FALLBACK.v2));
        setFlags({ v2, finance: Boolean(json?.dashboardV2Finance) }); // finance: server value only
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setFlags((f) => ({ ...f, v2: ENV_FALLBACK.v2 })); // endpoint unreachable → fail-closed; no override bypass
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { ...flags, resolved };
}
