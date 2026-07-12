import { CANONICAL_SURFACES } from '../../../../config/canonical-surface-names';

interface CoachCommandTitleInput {
  activeThreadTitle: string;
  commandText: string;
  hasActiveThread: boolean;
  routeClientLabel: string | null;
  routeIntent: string | null;
}

export function buildCoachCommandTitle({
  activeThreadTitle,
  commandText,
  hasActiveThread,
  routeClientLabel,
  routeIntent,
}: CoachCommandTitleInput): string {
  if (hasActiveThread) return activeThreadTitle;
  if (routeIntent === 'client_onboarding') {
    return routeClientLabel ? `${routeClientLabel} onboarding` : 'New client onboarding';
  }
  if (routeIntent === 'client_profile_coverage_update') {
    return routeClientLabel ? `${routeClientLabel} profile coverage update` : 'Client profile coverage update';
  }
  if (routeIntent === 'plan_review') {
    const planReviewTitle = `${CANONICAL_SURFACES.workoutPlanner.name} review`;
    return routeClientLabel ? `${routeClientLabel} ${planReviewTitle}` : planReviewTitle;
  }
  if (routeClientLabel) return `${routeClientLabel} daily workout log`;
  return commandText.slice(0, 60);
}
