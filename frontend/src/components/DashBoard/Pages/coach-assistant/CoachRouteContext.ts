/**
 * Read-only dashboard context contract for Swan Coach.
 *
 * The context binder lets the command lane know which dashboard surface is in
 * focus. It never grants write authority; every app-side mutation remains
 * approval-gated by deterministic backend services.
 */

export type CoachRouteSurface =
  | 'client_overview'
  | 'workout_logging'
  | 'progress'
  | 'community'
  | 'rewards'
  | 'profile'
  | 'schedule'
  | 'messages'
  | 'coach_command_center'
  | 'dashboard_unknown';

export type CoachActionMode = 'ask' | 'draft' | 'act';

export interface CoachRouteAction {
  key: string;
  mode: CoachActionMode;
  requiresApproval: boolean;
}

export interface CoachRouteContext {
  route: string;
  surface: CoachRouteSurface;
  scope: 'client' | 'trainer' | 'admin' | 'unknown';
  allowedActions: CoachRouteAction[];
  writeBackPolicy: 'approval_required';
}

const ACTIONS: Record<CoachRouteSurface, CoachRouteAction[]> = {
  client_overview: [
    { key: 'summarize_dashboard', mode: 'ask', requiresApproval: false },
    { key: 'draft_next_best_action', mode: 'draft', requiresApproval: true },
  ],
  workout_logging: [
    { key: 'explain_logged_workouts', mode: 'ask', requiresApproval: false },
    { key: 'draft_workout_log', mode: 'draft', requiresApproval: true },
  ],
  progress: [
    { key: 'summarize_progress', mode: 'ask', requiresApproval: false },
    { key: 'draft_workout_plan_delta', mode: 'draft', requiresApproval: true },
  ],
  community: [
    { key: 'summarize_community_activity', mode: 'ask', requiresApproval: false },
    { key: 'draft_social_post', mode: 'draft', requiresApproval: true },
  ],
  rewards: [
    { key: 'summarize_gamification', mode: 'ask', requiresApproval: false },
    { key: 'draft_challenge_update', mode: 'draft', requiresApproval: true },
  ],
  profile: [
    { key: 'summarize_profile_state', mode: 'ask', requiresApproval: false },
    { key: 'draft_profile_update', mode: 'draft', requiresApproval: true },
  ],
  schedule: [
    { key: 'summarize_schedule', mode: 'ask', requiresApproval: false },
    { key: 'draft_schedule_request', mode: 'draft', requiresApproval: true },
  ],
  messages: [
    { key: 'summarize_messages', mode: 'ask', requiresApproval: false },
    { key: 'draft_client_message', mode: 'draft', requiresApproval: true },
  ],
  coach_command_center: [
    { key: 'summarize_open_approvals', mode: 'ask', requiresApproval: false },
    { key: 'prepare_approval_draft', mode: 'draft', requiresApproval: true },
  ],
  dashboard_unknown: [
    { key: 'answer_dashboard_question', mode: 'ask', requiresApproval: false },
  ],
};

function routeScope(pathname: string): CoachRouteContext['scope'] {
  if (pathname.includes('/dashboard/client/')) return 'client';
  if (pathname.includes('/dashboard/trainer/')) return 'trainer';
  if (pathname.includes('/dashboard/admin/')) return 'admin';
  return 'unknown';
}

function routeSurface(pathname: string): CoachRouteSurface {
  if (pathname.includes('/coach-assistant')) return 'coach_command_center';
  if (pathname.includes('/log-workout') || pathname.includes('/workouts')) return 'workout_logging';
  if (pathname.includes('/progress')) return 'progress';
  if (pathname.includes('/community')) return 'community';
  if (pathname.includes('/rewards')) return 'rewards';
  if (pathname.includes('/profile')) return 'profile';
  if (pathname.includes('/schedule')) return 'schedule';
  if (pathname.includes('/messages')) return 'messages';
  if (pathname.includes('/overview')) return 'client_overview';
  return 'dashboard_unknown';
}

export function buildCoachRouteContext(pathname: string, search = ''): CoachRouteContext {
  const params = new URLSearchParams(search);
  const sourcePath = params.get('sourcePath') || pathname;
  const surface = routeSurface(sourcePath);

  return {
    route: sourcePath,
    surface,
    scope: routeScope(sourcePath),
    allowedActions: ACTIONS[surface],
    writeBackPolicy: 'approval_required',
  };
}
