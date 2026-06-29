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
  if (routeIntent === 'plan_review') {
    return routeClientLabel ? `${routeClientLabel} Build Plan review` : 'Build Plan review';
  }
  if (routeClientLabel) return `${routeClientLabel} daily workout log`;
  return commandText.slice(0, 60);
}
