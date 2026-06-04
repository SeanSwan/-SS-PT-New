import type { ClientHubQuickAction } from './ClientHubGridCardActions';
import {
  buildClientCoachDailyRoute,
  buildClientWorkoutLoggerRoute,
  buildClientWorkoutPlannerRoute,
} from './clientDailyTrainingRoutes';

export const buildClientCardQuickActionRoute = (
  clientId: number | string,
  action: ClientHubQuickAction,
) => {
  if (action === 'log') return buildClientWorkoutLoggerRoute(clientId);
  if (action === 'plan') return buildClientWorkoutPlannerRoute(clientId);
  if (action === 'coach') return buildClientCoachDailyRoute(clientId, 'log_workout');
  return null;
};
