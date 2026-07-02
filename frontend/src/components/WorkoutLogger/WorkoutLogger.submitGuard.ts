import { isNonDeductingClientSource } from '../../utils/clientSource';

export interface WorkoutSubmitBalanceGuardInput {
  availableSessions?: number | null;
  userRole?: string | null;
  clientSource?: string | null;
  scheduledSessionId?: string | null;
}

export function shouldBlockWorkoutSubmitForSessionBalance({
  availableSessions,
  userRole,
  clientSource,
  scheduledSessionId,
}: WorkoutSubmitBalanceGuardInput): boolean {
  return availableSessions === 0
    && userRole !== 'admin'
    && !scheduledSessionId
    && !isNonDeductingClientSource(clientSource);
}