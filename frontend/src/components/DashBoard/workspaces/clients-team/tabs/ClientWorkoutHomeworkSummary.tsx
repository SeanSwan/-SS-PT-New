/**
 * COMPONENT: ClientWorkoutHomeworkSummary
 * PURPOSE: Show trainer/admin read-only off-day homework status.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-08
 *
 * WIREFRAME:
 * +--------------------------------------------------------------+
 * | Off-day homework title + recent log count                    |
 * | today assignment: week/day, status, exercise count, billing  |
 * | recent homework history rows                                |
 * +--------------------------------------------------------------+
 *
 * DATA FLOW:
 * Props In:  { homeworkSummary }
 * State:     none
 * API Calls: none
 * Events:    none
 * Children:  none
 *
 * ARCHITECTURE:
 * graph TD
 *   ClientWorkoutPlansPanel --> ClientWorkoutHomeworkSummary
 *   ClientWorkoutHomeworkSummary --> SharedHomeworkSummaryModel
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
  summary.assignmentType === 'homework'
    ? 'Homework is non-billable. Session balance unchanged.'
    : summary.todayShouldDeductSession ? 'Paid session deduction flagged' : 'No paid session deduction'
);

const todayPositionLabel = (summary: ClientHomeworkSummary) => {
  const parts = [
    summary.todayWeekNumber ? `Week ${summary.todayWeekNumber}` : null,
    summary.todayDayNumber ? `Day ${summary.todayDayNumber}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'Today';
};

const ClientWorkoutHomeworkSummary: React.FC<ClientWorkoutHomeworkSummaryProps> = ({
  homeworkSummary,
}) => {
  if (!homeworkSummary) return null;
  const recentCompletions = homeworkSummary.recentCompletions.slice(0, 3);
  const hasTodayHomework = homeworkSummary.assignmentType === 'homework';
  const hasRecentHomework = recentCompletions.length > 0;
  if (!hasTodayHomework && !hasRecentHomework) return null;

  return (
    <VaultSection aria-label="Off-day homework summary">
      <VaultHeader>
        <VaultTitle><ClipboardCheck size={16} /> Off-Day Homework</VaultTitle>
        <VaultMeta>{recentLogLabel(homeworkSummary)}</VaultMeta>
      </VaultHeader>
      {hasTodayHomework && (
        <VaultGrid>
          <VaultSlot
            aria-label="Today homework assignment"
            $filled
            $primary={homeworkSummary.todayIsCompleted}
          >
            <VaultSlotTop>
              <VaultSlotLabel>{todayPositionLabel(homeworkSummary)}</VaultSlotLabel>
              <VaultSlotStatus $primary={homeworkSummary.todayIsCompleted}>
                {todayStatusLabel(homeworkSummary)}
              </VaultSlotStatus>
            </VaultSlotTop>
            <VaultSlotPlanName>{todayExerciseLabel(homeworkSummary)}</VaultSlotPlanName>
            <VaultSlotDetail>{deductionLabel(homeworkSummary)}</VaultSlotDetail>
          </VaultSlot>
        </VaultGrid>
      )}
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
