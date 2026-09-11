/**
 * G08 — dashboard surface context mapper (frontend mirror).
 *
 * Maps the current pathname to a dashboard surfaceKey so surfaces can label
 * their context. Declarations describe CONTEXT, never grants: capabilities
 * always come from the server-validated capability manifest
 * (backend/services/ai/dashboardSurfaceRegistry.mjs). Unknown paths resolve
 * to null — callers must treat null as explain-only.
 */

export interface SurfaceRoutePattern {
  surfaceKey: string;
  patterns: string[];
}

export const SURFACE_ROUTE_PATTERNS: SurfaceRoutePattern[] = [
  { surfaceKey: 'D01', patterns: ['/dashboard/*/coach-assistant', '/coach-assistant'] },
  { surfaceKey: 'D02', patterns: ['/dashboard/*/workout-planner', '/workout-planner'] },
  { surfaceKey: 'D03', patterns: ['/dashboard/*/workout-logger', '/dashboard/workout-logger', '/workout-logger', '/dashboard/*/my-workouts'] },
  { surfaceKey: 'D05', patterns: ['/dashboard/*/clients', '/dashboard/*/clients-team', '/dashboard/*/my-clients'] },
  { surfaceKey: 'D11', patterns: ['/dashboard/*/pain*', '/pain-tracker'] },
  { surfaceKey: 'D13', patterns: ['/dashboard/*/equipment'] },
  { surfaceKey: 'D19', patterns: ['/dashboard/*/progress', '/progress'] },
  { surfaceKey: 'D04', patterns: ['/dashboard/*/bootcamp'] },
  { surfaceKey: 'D06', patterns: ['/dashboard/*/onboarding'] },
  { surfaceKey: 'D07', patterns: ['/dashboard/*/waivers'] },
  { surfaceKey: 'D08', patterns: ['/dashboard/*/schedule'] },
  { surfaceKey: 'D09', patterns: ['/dashboard/*/trainers', '/dashboard/*/assignments'] },
  { surfaceKey: 'D10', patterns: ['/dashboard/*/billing', '/dashboard/*/payments', '/dashboard/*/earnings'] },
  { surfaceKey: 'D12', patterns: ['/dashboard/*/nutrition'] },
  { surfaceKey: 'D14', patterns: ['/dashboard/*/form-analysis', '/dashboard/*/movement'] },
  { surfaceKey: 'D15', patterns: ['/dashboard/*/achievements'] },
  { surfaceKey: 'D16', patterns: ['/dashboard/*/content-studio', '/dashboard/*/gallery'] },
  { surfaceKey: 'D17', patterns: ['/dashboard/*/account', '/dashboard/*/security'] },
  { surfaceKey: 'D18', patterns: ['/dashboard/*/support', '/dashboard/*/messages'] },
  { surfaceKey: 'D20', patterns: ['/dashboard/*/community'] },
  { surfaceKey: 'D21', patterns: ['/dashboard/*/notes'] },
  { surfaceKey: 'D22', patterns: ['/dashboard/*/internal', '/operator'] },
  { surfaceKey: 'D24', patterns: ['/dashboard/*/ai-consent', '/dashboard/*/settings/ai'] },
  { surfaceKey: 'D23', patterns: ['/dashboard', '/dashboard/*'] },
];

function patternToRegex(pattern: string): RegExp {
  // '*' = any characters within one path segment (prefix or suffix wildcard),
  // mirroring the backend registry's routePattern strings.
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, (char) => (char === '*' ? '\u0000' : `\\${char}`));
  const regex = `^${escaped.replace(/\u0000/g, '[^/]*')}(?:/|$)`;
  return new RegExp(regex);
}

const COMPILED = SURFACE_ROUTE_PATTERNS.map(({ surfaceKey, patterns }) => ({
  surfaceKey,
  regexes: patterns.map(patternToRegex),
}));

/** Longest/most-specific match wins: D23's broad '/dashboard/*' only fires
 * when no domain-specific surface matched. */
export function matchDashboardSurface(pathname: string): string | null {
  if (typeof pathname !== 'string' || pathname.length === 0) return null;
  let best: { surfaceKey: string; specificity: number } | null = null;
  for (const { surfaceKey, regexes } of COMPILED) {
    for (const regex of regexes) {
      if (regex.test(pathname)) {
        const specificity = pathname.match(regex)?.[0].length ?? 0;
        if (!best || specificity > best.specificity) best = { surfaceKey, specificity };
      }
    }
  }
  return best?.surfaceKey ?? null;
}
