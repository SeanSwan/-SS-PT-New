import type { CoachTab } from './CoachCommandTabBar';

export type CoachCommandRole = 'admin' | 'trainer' | 'client';
export type CoachReviewSection = 'intake' | 'audio' | 'drafts';

export const CLIENT_WORKOUTS_ROUTE = '/dashboard/client/workouts';
export const CLIENT_NEXT_ACTION_LABEL = 'Log today or choose the next safe move';

const OPERATOR_TABS: CoachTab[] = ['talk', 'review', 'history'];
const CLIENT_TABS: CoachTab[] = ['talk', 'history'];
const REVIEW_WORKSPACES = new Set(['review', 'intake', 'plaud', 'audio', 'onboarding', 'workbench', 'drafts']);

function tabFromRoute(searchParams: URLSearchParams): CoachTab | null {
  const workspace = searchParams.get('workspace');
  if (workspace === 'history') return 'history';
  if (workspace === 'chat' || workspace === 'talk') return 'talk';
  if (workspace && REVIEW_WORKSPACES.has(workspace)) return 'review';

  if (
    searchParams.get('mergeRequestId') ||
    searchParams.get('review') === 'next' ||
    searchParams.get('intake') ||
    searchParams.get('proposal')
  ) return 'review';

  return null;
}

export function reviewSectionFromRoute(searchParams: URLSearchParams): CoachReviewSection | null {
  const workspace = searchParams.get('workspace');
  if (workspace === 'onboarding' || workspace === 'workbench' || workspace === 'drafts') return 'drafts';
  if (workspace === 'plaud' || workspace === 'audio') return 'audio';
  if (workspace === 'intake') return 'intake';

  if (searchParams.get('mergeRequestId') || searchParams.get('review') === 'next') return 'audio';
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
  return coachTabsForRole(role).includes(tab) ? tab : 'talk';
}

export function routeForcedTabForRole(searchParams: URLSearchParams, role: CoachCommandRole): CoachTab | null {
  const routedTab = tabFromRoute(searchParams);
  return routedTab ? coerceCoachTabForRole(routedTab, role) : null;
}

export function hasCoachOperatorRouteContext(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get('clientId') ||
    searchParams.get('intent') ||
    searchParams.get('source') ||
    searchParams.get('returnTo') ||
    searchParams.get('sourcePath') ||
    searchParams.get('teachPrompt')
  );
}
