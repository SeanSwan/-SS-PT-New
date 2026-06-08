/**
 * ============================================================================
 * FILE: ClientCurrentWorkoutCard.tsx
 * PURPOSE: Current-workout call-to-action card for the client overview rail.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Converts the canonical current-workout read model into one compact client
 * dashboard CTA, including off-day homework, trainer sessions, rest days, and
 * completed assignment states.
 *
 * HOW IT FITS IN THE APP:
 * ClientHomeTab fetches /api/workouts/:clientId/current, then this card decides
 * the visible label and route target for logging today's assignment or reviewing
 * the broader workout plan/history.
 */

import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import {
  CardInner,
  MutedText,
  SectionKicker,
  SectionTitle,
} from './ClientObservatoryShell.styles';
import {
  SmallButton,
  WidgetCard,
  WidgetHeader,
  WidgetLabel,
  WidgetList,
  WidgetRow,
  WidgetValue,
} from './ClientObservatoryFeed.styles';
import {
  formatHomeworkCompletionDate,
  formatHomeworkCompletionExerciseLabel,
  formatHomeworkCompletionPosition,
  latestHomeworkCompletion,
} from '../../../shared/client-training/clientHomeworkSummary';
import type { CurrentClientWorkout } from './useCurrentClientWorkout';

interface ClientCurrentWorkoutCardProps {
  currentWorkout?: CurrentClientWorkout | null;
  currentWorkoutError?: boolean;
  currentWorkoutLoading?: boolean;
  onNavigate: (path: string) => void;
}

function workoutPosition(workout?: CurrentClientWorkout | null): string {
  if (!workout) return '6 Month plan pending';
  const parts = [
    workout.primaryPlanLabel ? `${workout.primaryPlanLabel} Primary` : null,
    workout.weekNumber ? `Week ${workout.weekNumber}` : null,
    workout.dayNumber ? `Day ${workout.dayNumber}` : null,
    workout.dayLabel || null,
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'Ready now';
}

const ASSIGNMENT_LABELS: Record<string, string> = {
  none: 'Plan Pending',
  trainer_session: 'Trainer Session',
  homework: 'Coach Homework',
  active_recovery: 'Active Recovery',
  rest: 'Rest Day',
  assessment: 'Assessment',
};

function assignmentLabel(type?: string): string {
  return type ? ASSIGNMENT_LABELS[type] || 'Coach Homework' : 'Coach Homework';
}

function sectionKickerLabel(workout?: CurrentClientWorkout | null): string {
  if (workout?.assignmentType === 'trainer_session') return 'Trainer Session';
  if (workout?.assignmentType === 'homework') return 'Suggested Off-Day Workout';
  if (workout?.assignmentType === 'rest') return 'Recovery Day';
  return 'Today\'s Assignment';
}

function workoutDetail(workout?: CurrentClientWorkout | null, error?: boolean): string {
  if (error) return 'Refresh this page or open the workout logger directly.';
  if (!workout) return 'Your trainer will assign the default 6 Month plan after assessment.';
  if (workout.assignmentStatus === 'completed') return 'Completed today - review your workout history and progress.';
  if (workout.assignmentType === 'rest') return 'Recovery guidance is visible in your main plan today.';
  if (workout.assignmentType === 'trainer_session') {
    return 'Trainer-led sessions are logged by your coach from the schedule so progress and paid-session credits stay tied to the appointment.';
  }
  if (workout.exerciseCount <= 0) return 'Open your plan vault to review the next training block.';
  const suffix = workout.firstExercise ? ` - starts with ${workout.firstExercise}` : '';
  if (workout.assignmentType === 'homework') {
    return `Today's assignment - off-day plan work - ${workout.exerciseCount} exercise${workout.exerciseCount === 1 ? '' : 's'}${suffix}. No paid session deduction.`;
  }
  return `${workout.exerciseCount} exercise${workout.exerciseCount === 1 ? '' : 's'}${suffix}`;
}

function workoutTitle(
  workout?: CurrentClientWorkout | null,
  error?: boolean,
  loading?: boolean,
): string {
  return loading
    ? 'Loading plan'
    : workout?.title || (error ? 'Assignment unavailable' : 'Plan pending');
}

function workoutActionPath(workout?: CurrentClientWorkout | null): string {
  if (workout?.assignmentType === 'trainer_session' && !workout.isLoggable) {
    return '/dashboard/client/schedule';
  }
  if (!workout?.isLoggable) return '/dashboard/client/workouts';

  const params = new URLSearchParams({ loadPlan: 'today' });
  if (workout.assignmentKey) params.set('assignmentKey', workout.assignmentKey);
  if (workout.assignmentType) params.set('assignmentType', workout.assignmentType);
  return `/dashboard/client/log-workout?${params.toString()}`;
}

function workoutActionLabel(workout?: CurrentClientWorkout | null): string {
  if (workout?.assignmentType === 'trainer_session' && !workout.isLoggable) {
    return 'View Schedule';
  }
  if (workout?.ctaLabel) return workout.ctaLabel;
  if (workout?.isLoggable) {
    return workout.assignmentType === 'trainer_session' ? 'Log Workout' : 'Log Assignment';
  }
  return 'View Plan';
}

function workoutActionAriaLabel(workout?: CurrentClientWorkout | null): string {
  if (workout?.assignmentType === 'trainer_session' && !workout.isLoggable) {
    return 'View schedule for trainer-led session';
  }
  return workout?.isLoggable ? 'Log today\'s assignment' : workout?.ctaLabel || 'View training plan';
}

function homeworkLogValue(workout?: CurrentClientWorkout | null): string {
  const count = workout?.homeworkSummary?.recentCompletedCount || 0;
  return count === 1 ? '1 completed' : `${count} completed`;
}

function homeworkLogLabel(workout?: CurrentClientWorkout | null): string {
  const summary = workout?.homeworkSummary;
  const suffix = summary?.todayIsCompleted ? ' - completed today' : summary?.todayIsLoggable ? ' - ready' : '';
  return `Off-day logs${suffix}`;
}

const ClientCurrentWorkoutCard: React.FC<ClientCurrentWorkoutCardProps> = ({
  currentWorkout,
  currentWorkoutError,
  currentWorkoutLoading,
  onNavigate,
}) => {
  const latestCompletion = latestHomeworkCompletion(currentWorkout?.homeworkSummary);

  return (
    <WidgetCard data-testid="current-workout-card">
      <CardInner>
        <WidgetHeader>
          <div>
            <SectionKicker>
              <ClipboardCheck size={14} aria-hidden="true" />
              {sectionKickerLabel(currentWorkout)}
            </SectionKicker>
            <SectionTitle>{workoutTitle(currentWorkout, currentWorkoutError, currentWorkoutLoading)}</SectionTitle>
          </div>
          <SmallButton
            type="button"
            aria-label={workoutActionAriaLabel(currentWorkout)}
            onClick={() => onNavigate(workoutActionPath(currentWorkout))}
          >
            {workoutActionLabel(currentWorkout)}
          </SmallButton>
        </WidgetHeader>
        <WidgetList>
          <WidgetRow>
            <WidgetLabel>{workoutPosition(currentWorkout)}</WidgetLabel>
            <WidgetValue>{assignmentLabel(currentWorkout?.assignmentType)}</WidgetValue>
          </WidgetRow>
          {currentWorkout?.homeworkSummary && (
            <WidgetRow>
              <WidgetLabel>{homeworkLogLabel(currentWorkout)}</WidgetLabel>
              <WidgetValue>{homeworkLogValue(currentWorkout)}</WidgetValue>
            </WidgetRow>
          )}
          {latestCompletion && (
            <WidgetRow>
              <WidgetLabel>
                Recent homework - {formatHomeworkCompletionPosition(latestCompletion, ' ')}
                {' - '}
                {formatHomeworkCompletionDate(latestCompletion)}
              </WidgetLabel>
              <WidgetValue>{formatHomeworkCompletionExerciseLabel(latestCompletion)}</WidgetValue>
            </WidgetRow>
          )}
        </WidgetList>
        <MutedText $top="0.75rem">
          {workoutDetail(currentWorkout, currentWorkoutError)}
        </MutedText>
      </CardInner>
    </WidgetCard>
  );
};

export default ClientCurrentWorkoutCard;
