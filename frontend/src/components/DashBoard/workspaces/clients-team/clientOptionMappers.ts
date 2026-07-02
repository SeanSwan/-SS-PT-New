/**
 * PURPOSE: Typed mappers between Client Hub list cards and detail panes.
 */

import type { ClientOption } from './ClientSelectorDropdown';
import type { MiniCardClient } from './ClientMiniCard';
import { isNonDeductingClientAccount, normalizeAvailableSessions } from './clientSessionSignal';

export const normalizeClientOptionId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const normalizeWorkoutCount = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

export const mapAdminClientToClientOption = (client: any): ClientOption | null => {
  const id = normalizeClientOptionId(client?.id);
  if (!id) return null;

  return {
    id,
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    email: client.email || '',
    clientSource: client.clientSource || 'swanstudios',
    sessionBillingMode: client.sessionBillingMode || 'paid_sessions',
    isActive: client.isActive !== false,
    accountStatus: typeof client.accountStatus === 'string' ? client.accountStatus : undefined,
    availableSessions: normalizeAvailableSessions(client.availableSessions),
    workoutCount: normalizeWorkoutCount(client.totalWorkouts),
    fitnessGoal: client.fitnessGoal || '',
    trainingExperience: client.trainingExperience || '',
    dateOfBirth: client.dateOfBirth || null,
    onboardingComplete: Boolean(client.onboardingComplete),
    isOnboardingComplete: Boolean(client.isOnboardingComplete),
    onboardingPct: client.onboardingPct ?? null,
    onboardingCompletionPercentage: client.onboardingCompletionPercentage ?? null,
    completionPercentage: client.completionPercentage ?? null,
    onboardingFieldLedger: client.onboardingFieldLedger ?? null,
    onboardingMissingFields: Array.isArray(client.onboardingMissingFields) ? client.onboardingMissingFields : [],
  };
};

export const toMiniCardClient = (client: ClientOption | null): MiniCardClient | null => {
  if (!client) return null;

  const sessionsLeft = isNonDeductingClientAccount(client)
    ? 0
    : normalizeAvailableSessions(client.availableSessions);

  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    status: client.isActive ? 'active' as const : 'inactive' as const,
    tier: sessionsLeft > 20 ? 'elite' : sessionsLeft > 0 ? 'premium' : 'starter',
    engagementScore: 50,
    lastWeighIn: null,
    sessionsLeft,
    workoutCount: normalizeWorkoutCount(client.workoutCount),
  };
};
