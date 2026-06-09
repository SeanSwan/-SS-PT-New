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
  buildHomeworkAccountabilityStatus,
  formatHomeworkCompletionDate,
  formatHomeworkCompletionExerciseLabel,
  formatHomeworkCompletionPosition,
  type ClientHomeworkSummary,
  type ClientHomeworkAccountabilityStatus,
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

const AccountabilityStatusCard: React.FC<{
  status: ClientHomeworkAccountabilityStatus | null;
  summary: ClientHomeworkSummary;
}> = ({ status, summary }) => {
  if (!status) return null;
  return (
    <VaultGrid>
      <VaultSlot aria-label="Homework accountability status" $filled $primary={status.isPrimarySignal}>
        <VaultSlotTop>
          <VaultSlotLabel>Accountability</VaultSlotLabel>
          <VaultSlotStatus $primary={status.isPrimarySignal}>{status.label}</VaultSlotStatus>
        </VaultSlotTop>
        <VaultSlotPlanName>{status.detail}</VaultSlotPlanName>
        <VaultSlotDetail>{deductionLabel(summary)}</VaultSlotDetail>
      </VaultSlot>
    </VaultGrid>
  );
};

const TodayHomeworkCard: React.FC<{ summary: ClientHomeworkSummary }> = ({ summary }) => (
  <VaultGrid>
    <VaultSlot aria-label="Today homework assignment" $filled $primary={summary.todayIsCompleted}>
      <VaultSlotTop>
        <VaultSlotLabel>{todayPositionLabel(summary)}</VaultSlotLabel>
        <VaultSlotStatus $primary={summary.todayIsCompleted}>{todayStatusLabel(summary)}</VaultSlotStatus>
      </VaultSlotTop>
      <VaultSlotPlanName>{todayExerciseLabel(summary)}</VaultSlotPlanName>
      <VaultSlotDetail>{deductionLabel(summary)}</VaultSlotDetail>
    </VaultSlot>
  </VaultGrid>
);

const RecentHomeworkHistory: React.FC<{ completions: ClientHomeworkSummary['recentCompletions'] }> = ({
  completions,
}) => {
  if (!completions.length) return null;
  return (
    <>
      <VaultHeader>
        <VaultTitle>Recent Homework History</VaultTitle>
        <VaultMeta>Last {completions.length}</VaultMeta>
      </VaultHeader>
      <VaultGrid>
        {completions.map((completion) => (
          <VaultSlot
            key={`${completion.completedAt || completion.scheduledDate}-${completion.weekNumber}-${completion.dayNumber}`}
            $filled
            $primary={false}
          >
            <VaultSlotTop>
              <VaultSlotLabel>{formatHomeworkCompletionPosition(completion, ' - ', 'Logged homework')}</VaultSlotLabel>
              <VaultSlotStatus $primary={false}>{formatHomeworkCompletionDate(completion)}</VaultSlotStatus>
            </VaultSlotTop>
            <VaultSlotPlanName>{formatHomeworkCompletionExerciseLabel(completion, { startsWith: true })}</VaultSlotPlanName>
            <VaultSlotDetail>Homework diary complete</VaultSlotDetail>
          </VaultSlot>
        ))}
      </VaultGrid>
    </>
  );
};

const OptionalTodayHomeworkCard: React.FC<{ summary: ClientHomeworkSummary | null }> = ({ summary }) => (
  summary ? <TodayHomeworkCard summary={summary} /> : null
);

const todayHomeworkSummary = (summary: ClientHomeworkSummary) => (
  summary.assignmentType === 'homework' ? summary : null
);

const recentHomeworkCompletions = (summary: ClientHomeworkSummary) => (
  summary.recentCompletions.slice(0, 3)
);

const hasHomeworkPanelContent = (
  todaySummary: ClientHomeworkSummary | null,
  recentCompletions: ClientHomeworkSummary['recentCompletions'],
) => {
  if (todaySummary) return true;
  return recentCompletions.length > 0;
};

const homeworkPanelViewModel = (summary: ClientHomeworkSummary | null) => {
  if (!summary) return null;
  const todaySummary = todayHomeworkSummary(summary);
  const recentCompletions = recentHomeworkCompletions(summary);
  if (!hasHomeworkPanelContent(todaySummary, recentCompletions)) return null;
  return {
    summary,
    todaySummary,
    recentCompletions,
    accountabilityStatus: buildHomeworkAccountabilityStatus(summary),
  };
};

const ClientWorkoutHomeworkSummary: React.FC<ClientWorkoutHomeworkSummaryProps> = ({ homeworkSummary }) => {
  const viewModel = homeworkPanelViewModel(homeworkSummary);
  if (!viewModel) return null;

  return (
    <VaultSection aria-label="Off-day homework summary">
      <VaultHeader>
        <VaultTitle><ClipboardCheck size={16} /> Off-Day Homework</VaultTitle>
        <VaultMeta>{recentLogLabel(viewModel.summary)}</VaultMeta>
      </VaultHeader>
      <AccountabilityStatusCard status={viewModel.accountabilityStatus} summary={viewModel.summary} />
      <OptionalTodayHomeworkCard summary={viewModel.todaySummary} />
      <RecentHomeworkHistory completions={viewModel.recentCompletions} />
    </VaultSection>
  );
};

export default ClientWorkoutHomeworkSummary;
