/**
 * ============================================================================
 * FILE: swanCoachDashboardRoute.ts
 * PURPOSE: Shared role-aware route helpers for mounted dashboard actions.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Converts the current user role into canonical
 * UniversalDashboardLayout paths for user-dashboard action buttons.
 *
 * HOW IT FITS IN THE APP: Used by Home tab and Observatory entry points so
 * dashboard buttons navigate to mounted role routes instead of stale aliases.
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

export function getLogWorkoutDashboardPath(role?: string | null): string {
  const dashboardRole = getDashboardRolePath(role);
  if (dashboardRole === 'admin') return '/dashboard/admin/client-management?intent=log_workout';
  if (dashboardRole === 'trainer') return '/dashboard/trainer/clients?intent=log_workout';

  return '/dashboard/client/log-workout';
}

export function getPersonalLogWorkoutDashboardPath(): string {
  return '/dashboard/client/log-workout';
}
