/**
 * Client Hub off-day homework summary.
 * ====================================
 *
 * Shows trainer/admin users the current homework completion state and recent
 * off-day log count from the shared client training read model.
 */

import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { ClientHomeworkSummary } from './ClientWorkoutPlansPanel.logic';
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
    </VaultSection>
  );
};

export default ClientWorkoutHomeworkSummary;
