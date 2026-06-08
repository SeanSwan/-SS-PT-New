/**
 * ============================================================================
 * FILE: ClientWorkoutHomeworkSummary.tsx
 * PURPOSE: Trainer/admin read-only off-day homework status panel.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Shows today's homework assignment state plus recent homework completion
 * history from the shared client training read model.
 *
 * HOW IT FITS IN THE APP:
 * ClientWorkoutPlansPanel renders this beside plan-vault arcs so trainers and
 * admins can quickly see whether assigned off-day work is visible and complete.
 */

import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import {
  formatHomeworkCompletionDate,
  formatHomeworkCompletionExerciseLabel,
  formatHomeworkCompletionPosition,
  type ClientHomeworkSummary,
} from '../../../shared/client-training/clientHomeworkSummary';
import {
  VaultGrid,
  VaultHeader,
  VaultMeta,
  VaultSection,
  VaultSlot,
  VaultSlotDetail,
  VaultSlotLabel,
  VaultSlotPlanName,
  VaultSlotStatus,
  VaultSlotTop,
  VaultTitle,
} from './ClientWorkoutPlansPanel.styles';

interface ClientWorkoutHomeworkSummaryProps {
  homeworkSummary: ClientHomeworkSummary | null;
}

const todayStatusLabel = (summary: ClientHomeworkSummary) => {
  if (summary.todayIsCompleted) return 'Completed today';
  if (summary.todayIsLoggable) return 'Ready to log';
  return summary.todayStatus === 'none' ? 'No assignment today' : 'Plan visible';
};

const todayExerciseLabel = (summary: ClientHomeworkSummary) => {
  if (summary.todayExerciseCount <= 0) return 'No homework exercises assigned today';
  const suffix = summary.todayFirstExerciseName ? ` - starts with ${summary.todayFirstExerciseName}` : '';
  return `${summary.todayExerciseCount} exercise${summary.todayExerciseCount === 1 ? '' : 's'}${suffix}`;
};

const recentLogLabel = (summary: ClientHomeworkSummary) => (
  `${summary.recentCompletedCount} recent log${summary.recentCompletedCount === 1 ? '' : 's'}`
);

const deductionLabel = (summary: ClientHomeworkSummary) => (
  summary.todayShouldDeductSession ? 'Paid session deduction flagged' : 'No paid session deduction'
);

const ClientWorkoutHomeworkSummary: React.FC<ClientWorkoutHomeworkSummaryProps> = ({
  homeworkSummary,
}) => {
  if (!homeworkSummary) return null;
  const recentCompletions = homeworkSummary.recentCompletions.slice(0, 3);

  return (
    <VaultSection aria-label="Off-day homework summary">
      <VaultHeader>
        <VaultTitle><ClipboardCheck size={16} /> Off-Day Homework</VaultTitle>
        <VaultMeta>{recentLogLabel(homeworkSummary)}</VaultMeta>
      </VaultHeader>
      <VaultGrid>
        <VaultSlot $filled $primary={homeworkSummary.todayIsCompleted}>
          <VaultSlotTop>
            <VaultSlotLabel>Today</VaultSlotLabel>
            <VaultSlotStatus $primary={homeworkSummary.todayIsCompleted}>
              {todayStatusLabel(homeworkSummary)}
            </VaultSlotStatus>
          </VaultSlotTop>
          <VaultSlotPlanName>{todayExerciseLabel(homeworkSummary)}</VaultSlotPlanName>
          <VaultSlotDetail>{deductionLabel(homeworkSummary)}</VaultSlotDetail>
        </VaultSlot>
      </VaultGrid>
      {recentCompletions.length > 0 && (
        <>
          <VaultHeader>
            <VaultTitle>Recent Homework History</VaultTitle>
            <VaultMeta>Last {recentCompletions.length}</VaultMeta>
          </VaultHeader>
          <VaultGrid>
            {recentCompletions.map((completion) => (
              <VaultSlot
                key={`${completion.completedAt || completion.scheduledDate}-${completion.weekNumber}-${completion.dayNumber}`}
                $filled
                $primary={false}
              >
                <VaultSlotTop>
                  <VaultSlotLabel>{formatHomeworkCompletionPosition(completion, ' - ', 'Logged homework')}</VaultSlotLabel>
                  <VaultSlotStatus $primary={false}>
                    {formatHomeworkCompletionDate(completion)}
                  </VaultSlotStatus>
                </VaultSlotTop>
                <VaultSlotPlanName>
                  {formatHomeworkCompletionExerciseLabel(completion, { startsWith: true })}
                </VaultSlotPlanName>
                <VaultSlotDetail>Homework diary complete</VaultSlotDetail>
              </VaultSlot>
            ))}
          </VaultGrid>
        </>
      )}
    </VaultSection>
  );
};

export default ClientWorkoutHomeworkSummary;
