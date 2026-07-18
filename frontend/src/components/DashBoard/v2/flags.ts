/**
 * Dashboards v2 — feature flags (KIMI-DASHBOARDS-CORRECTED §0/§6.3). Fail-closed.
 *
 * Resolution order: runtime `/api/config/public-flags` (wins) → build-time env → **false**.
 * Until the runtime payload resolves, flags read the env fallback (default false), so the gate
 * renders V1. `finance` is ALSO enforced server-side; the client value only hides UI.
 */
import { useEffect, useState } from 'react';

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

export function useDashboardV2Flags(): DashboardV2Flags & { resolved: boolean } {
  const [flags, setFlags] = useState<DashboardV2Flags>(ENV_FALLBACK);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { dashboardV2?: unknown; dashboardV2Finance?: unknown } | null) => {
        if (!alive) return;
        if (json && typeof json.dashboardV2 === 'boolean') {
          setFlags({ v2: Boolean(json.dashboardV2), finance: Boolean(json.dashboardV2Finance) });
        }
        setResolved(true);
      })
      .catch(() => {
        if (alive) setResolved(true); // network fail → keep fail-closed env fallback
      });
    return () => {
      alive = false;
    };
  }, []);

  return { ...flags, resolved };
}
