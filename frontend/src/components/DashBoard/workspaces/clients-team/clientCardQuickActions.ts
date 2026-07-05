import type { ClientHubQuickAction } from './ClientHubGridCardActions';
import type { ClientHubAudience } from './clientHubAudience';
import {
  buildClientCoachDailyRoute,
  buildClientWorkoutLoggerRoute,
  buildClientWorkoutPlannerRoute,
} from './clientDailyTrainingRoutes';

export const buildClientCardQuickActionRoute = (
  clientId: number | string,
  action: ClientHubQuickAction,
  audience: ClientHubAudience = 'admin',
) => {
  if (action === 'log') return buildClientWorkoutLoggerRoute(clientId, audience);
  if (action === 'plan') return buildClientWorkoutPlannerRoute(clientId, audience);
  if (action === 'coach') return buildClientCoachDailyRoute(clientId, 'log_workout', audience);
  return null;
};
