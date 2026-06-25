import type { CoachTab } from './CoachCommandTabBar';

export type CoachCommandRole = 'admin' | 'trainer' | 'client';

export const CLIENT_WORKOUTS_ROUTE = '/dashboard/client/workouts';
export const CLIENT_NEXT_ACTION_LABEL = 'Log today or choose the next safe move';

const OPERATOR_TABS: CoachTab[] = ['chat', 'intake', 'plaud', 'history'];
const CLIENT_TABS: CoachTab[] = ['chat', 'history'];


function tabFromRoute(searchParams: URLSearchParams): CoachTab | null {
  if (
    searchParams.get('workspace') === 'plaud' ||
    searchParams.get('mergeRequestId') ||
    searchParams.get('review') === 'next'
  ) return 'plaud';
  if (searchParams.get('intake') || searchParams.get('proposal')) return 'intake';
  return null;
}

export function normalizeCoachCommandRole(role: unknown): CoachCommandRole {
  return role === 'trainer' || role === 'client' ? role : 'admin';
}

export function isClientCoachRole(role: CoachCommandRole): boolean {
  return role === 'client';
}

export function coachTabsForRole(role: CoachCommandRole): CoachTab[] {
  return isClientCoachRole(role) ? CLIENT_TABS : OPERATOR_TABS;
}

export function coerceCoachTabForRole(tab: CoachTab, role: CoachCommandRole): CoachTab {
  return coachTabsForRole(role).includes(tab) ? tab : 'chat';
}

export function routeForcedTabForRole(searchParams: URLSearchParams, role: CoachCommandRole): CoachTab | null {
  const routedTab = tabFromRoute(searchParams);
  return routedTab ? coerceCoachTabForRole(routedTab, role) : null;
}
