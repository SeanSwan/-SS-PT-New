import React from 'react';
import styled from 'styled-components';
import type { ClientInfoStatus } from './useWorkoutPlanLoading';
import type { WorkoutLoggerClient } from './WorkoutLogger.localTypes';
import type { ExerciseEntry } from '../../services/nasmApiService';

const RecoveryNotice = styled.section`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 48%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--warning, #f59e0b) 9%, var(--world-panel, #141419));
  color: var(--world-text, #e0ecf4);
  font: 0.8rem/1.4 'Sora', sans-serif;

  p { margin: 0; }
  strong { display: block; color: var(--warning, #f59e0b); }

  @media (max-width: 600px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const RetryButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  margin-left: auto;
  padding: 8px 14px;
  border: 1px solid var(--world-accent, #60c0f0);
  border-radius: 8px;
  background: color-mix(in srgb, var(--world-accent, #60c0f0) 14%, transparent);
  color: var(--world-text, #e0ecf4);
  font: 600 0.78rem 'Sora', sans-serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }

  @media (max-width: 600px) { margin-left: 0; width: 100%; }
`;

export interface WorkoutLoggerRecoveryProps {
  clientInfoStatus: ClientInfoStatus;
  clientInfoError?: string | null;
  onRetry: () => void;
  hasDraft?: boolean;
  legacyQueuePresent?: boolean;
}

export const createUnavailableWorkoutLoggerClient = (
  effectiveClientId: number | undefined,
): WorkoutLoggerClient => ({
  id: effectiveClientId ?? 0,
  firstName: 'Client information unavailable',
  lastName: '',
  email: '',
  availableSessions: null,
  clientSource: null,
  phone: '',
});

export const isWorkoutLoggerClientInfoUnavailable = (
  status: ClientInfoStatus,
  client: WorkoutLoggerClient | null,
): boolean => status === 'unavailable' || client?.availableSessions === null;

export const hasWorkoutLoggerDraft = (
  exercises: ExerciseEntry[],
  warmupCount: number,
  balanceCount: number,
  cooldownCount: number,
  sessionNotes: string,
  overallIntensity: number | null,
): boolean => exercises.length > 0
  || warmupCount > 0
  || balanceCount > 0
  || cooldownCount > 0
  || sessionNotes.trim().length > 0
  || overallIntensity !== null;

const WorkoutLoggerRecovery: React.FC<WorkoutLoggerRecoveryProps> = ({
  clientInfoStatus,
  clientInfoError,
  onRetry,
  hasDraft = false,
  legacyQueuePresent = false,
}) => {
  if (clientInfoStatus === 'loading' && !hasDraft && !legacyQueuePresent) return null;

  return (
    <>
      {clientInfoStatus === 'unavailable' && (
        <RecoveryNotice role='alert' aria-live='polite' aria-atomic='true'>
          <p>
            <strong>Client information unavailable.</strong>
            {hasDraft ? 'Your workout draft is kept.' : 'Your workout entries remain on this screen.'}
            {clientInfoError ? ` ${clientInfoError}` : ''}
          </p>
          <RetryButton type='button' aria-live='off' onClick={onRetry}>
            Retry client information
          </RetryButton>
        </RecoveryNotice>
      )}
      {clientInfoStatus === 'loading' && hasDraft && (
        <RecoveryNotice role='status' aria-live='polite' aria-atomic='true'>
          <p>
            <strong>Loading client information…</strong>
            Your workout draft is kept while details are refreshed.
          </p>
        </RecoveryNotice>
      )}
      {legacyQueuePresent && (
        <RecoveryNotice role='status' aria-live='polite' aria-atomic='true'>
          <p>
            <strong>Older offline records need owner verification.</strong>
            They are retained on this device and will not be submitted automatically.
          </p>
        </RecoveryNotice>
      )}
    </>
  );
};

export default WorkoutLoggerRecovery;
