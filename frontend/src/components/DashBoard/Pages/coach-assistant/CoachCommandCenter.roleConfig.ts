import type { CoachTab } from './CoachCommandTabBar';
import type { CoachQuickIntent } from './CoachConsoleDock';

export type CoachCommandRole = 'admin' | 'trainer' | 'client';

export const CLIENT_WORKOUTS_ROUTE = '/dashboard/client/workouts';
export const CLIENT_NEXT_ACTION_LABEL = 'Log today or choose the next safe move';
export const CLIENT_NEXT_ACTION_PROMPT =
  "Help me choose one simple next step today: log my workout, review my plan, check progress, or ask my trainer. Keep it short and safe.";

const OPERATOR_TABS: CoachTab[] = ['chat', 'intake', 'plaud', 'history'];
const CLIENT_TABS: CoachTab[] = ['chat', 'history'];

const OPERATOR_QUICK_INTENTS: CoachQuickIntent[] = [
  { label: 'Log workout', prompt: 'Log a workout for the selected client: ' },
  { label: 'Onboard client', prompt: 'Onboard a new client: ' },
  { label: 'Update log', prompt: 'Update the workout log for the selected client: ' },
  { label: 'Recall', prompt: 'Summarize what we covered for the selected client last session.' },
];

const CLIENT_QUICK_INTENTS: CoachQuickIntent[] = [
  { label: 'Log today', prompt: "Help me log today's workout. Ask for exercises, sets, reps, load, pain, and notes." },
  { label: 'Explain plan', prompt: "Explain today's workout plan in plain English and tell me the first move." },
  { label: 'Check progress', prompt: 'Look at my progress context and tell me the next safe training action.' },
  { label: 'Ask trainer', prompt: 'Help me write one clear question for my trainer about my workout.' },
];

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

export function quickIntentsForRole(role: CoachCommandRole): CoachQuickIntent[] {
  return isClientCoachRole(role) ? CLIENT_QUICK_INTENTS : OPERATOR_QUICK_INTENTS;
}
