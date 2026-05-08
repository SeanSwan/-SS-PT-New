/**
 * ============================================================================
 * FILE: swanCoachDashboardRoute.ts
 * PURPOSE: Shared role-aware route helper for opening the mounted Swan Coach.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Converts the current user role into the canonical
 * UniversalDashboardLayout coach-assistant path.
 *
 * HOW IT FITS IN THE APP: Used by Home tab Swan Coach entry points so they
 * navigate to mounted dashboard routes instead of stale standalone aliases.
 *
 * KEY DECISIONS:
 * - Unknown/member/user roles default to client, matching the member dashboard.
 * - Helper stays UI-only and does not inspect auth state directly.
 */

const DASHBOARD_ROLE_PATHS = new Set(['admin', 'trainer', 'client']);

export function getDashboardRolePath(role?: string | null): 'admin' | 'trainer' | 'client' {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole && DASHBOARD_ROLE_PATHS.has(normalizedRole)) {
    return normalizedRole as 'admin' | 'trainer' | 'client';
  }

  return 'client';
}

export function getSwanCoachDashboardPath(role?: string | null): string {
  return `/dashboard/${getDashboardRolePath(role)}/coach-assistant`;
}
