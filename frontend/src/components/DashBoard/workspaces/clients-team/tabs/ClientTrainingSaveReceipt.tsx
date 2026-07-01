/**
 * ============================================================================
 * FILE: ClientTrainingSaveReceipt.tsx
 * PURPOSE: Post-save proof receipt for selected-client training logs.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Shows a compact saved-workout receipt after WorkoutLogger confirms a persisted
 * daily form, with a one-tap path to the client's progress proof surface.
 *
 * HOW IT FITS IN THE APP:
 * TrainingTabContent renders this above Workout History after WorkoutLogger
 * calls onComplete with the saved form response.
 */

import React from 'react';
import styled from 'styled-components';
import { BarChart3, CheckCircle2 } from 'lucide-react';

interface ClientTrainingPlanCursor {
  week?: string | number | null;
  day?: string | number | null;
}

interface ClientTrainingPlanProgress {
  advanced?: boolean | null;
  planCompleted?: boolean | null;
  previous?: ClientTrainingPlanCursor | null;
  next?: ClientTrainingPlanCursor | null;
}

interface ClientTrainingPlannedAssignment {
  weekNumber?: string | number | null;
  dayNumber?: string | number | null;
}

export interface ClientTrainingSavedWorkout {
  id?: string | number | null;
  formId?: string | number | null;
  date?: string | null;
  sessionDeducted?: boolean | null;
  scheduledSessionId?: string | number | null;
  plannedAssignment?: ClientTrainingPlannedAssignment | null;
  planProgress?: ClientTrainingPlanProgress | null;
}

interface ClientTrainingSaveReceiptProps {
  clientName: string;
  savedWorkout: ClientTrainingSavedWorkout;
  onOpenProgress?: () => void;
}

const Receipt = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-elevated, #1A1A24) 90%, var(--accent-gold, #C6A84B) 10%),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, var(--accent-primary, #60C0F0) 8%));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Copy = styled.div`
  min-width: 0;
  display: grid;
  gap: 5px;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const Title = styled.h4`
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  line-height: 1.2;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--text-muted, rgba(224, 236, 244, 0.76));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

const ProofButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 13px;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, var(--bg-base, #0A0A0F));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const getReceiptId = (savedWorkout: ClientTrainingSavedWorkout) =>
  String(savedWorkout.id ?? savedWorkout.formId ?? 'saved-workout');

const getDeductionLabel = (value: ClientTrainingSavedWorkout['sessionDeducted']) => {
  if (value === true) return 'Session deducted';
  if (value === false) return 'No session deduction';
  return 'Session policy recorded';
};

const getScheduledSessionLabel = (value: ClientTrainingSavedWorkout['scheduledSessionId']) => {
  if (value === null || value === undefined || value === '') return null;
  return `Booked session ${String(value)}`;
};

const formatCursorPart = (prefix: 'W' | 'D', value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  return text ? `${prefix}${text}` : null;
};

const formatPlanCursor = (cursor?: ClientTrainingPlanCursor | null) => {
  const week = formatCursorPart('W', cursor?.week);
  const day = formatCursorPart('D', cursor?.day);
  if (week && day) return `${week}${day}`;
  return week || day;
};

const getPlannedAssignmentCursor = (assignment?: ClientTrainingPlannedAssignment | null) => (
  formatPlanCursor({ week: assignment?.weekNumber, day: assignment?.dayNumber })
);

const getPlanProgressLabel = (savedWorkout: ClientTrainingSavedWorkout) => {
  const progress = savedWorkout.planProgress;
  if (!progress?.advanced) return null;
  const previous = formatPlanCursor(progress.previous) ?? getPlannedAssignmentCursor(savedWorkout.plannedAssignment);
  if (progress.planCompleted) return previous ? `Plan completed from ${previous}` : 'Plan completed';
  const next = formatPlanCursor(progress.next);
  if (previous && next) return `Plan advanced ${previous} -> ${next}`;
  if (next) return `Plan advanced to ${next}`;
  return previous ? `Plan advanced from ${previous}` : 'Plan advanced';
};

const ClientTrainingSaveReceipt: React.FC<ClientTrainingSaveReceiptProps> = ({
  clientName,
  savedWorkout,
  onOpenProgress,
}) => {
  const scheduledSessionLabel = getScheduledSessionLabel(savedWorkout.scheduledSessionId);
  const planProgressLabel = getPlanProgressLabel(savedWorkout);

  return (
    <Receipt role="status" aria-live="polite">
      <Copy>
        <Eyebrow><CheckCircle2 size={14} /> Workout saved</Eyebrow>
        <Title>{clientName} history is updated.</Title>
        <Meta>
          <span>Form {getReceiptId(savedWorkout)}</span>
          {savedWorkout.date && <span>{savedWorkout.date}</span>}
          {scheduledSessionLabel && <span>{scheduledSessionLabel}</span>}
          {planProgressLabel && <span>{planProgressLabel}</span>}
          <span>{getDeductionLabel(savedWorkout.sessionDeducted)}</span>
        </Meta>
      </Copy>
      {onOpenProgress && (
        <ProofButton
          type="button"
          onClick={onOpenProgress}
          aria-label={`Open ${clientName} progress proof`}
        >
          <BarChart3 size={15} />
          Progress Proof
        </ProofButton>
      )}
    </Receipt>
  );
};

export default ClientTrainingSaveReceipt;
