/**
 * FILE: ClientCurrentWorkoutCard.tsx
 * PURPOSE: Current-workout call-to-action card for the client overview rail.
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
  if (workout?.assignmentType === 'rest') return 'Recovery Day';
  return 'Today\'s Assignment';
}

function workoutDetail(workout?: CurrentClientWorkout | null, error?: boolean): string {
  if (error) return 'Refresh this page or open the workout logger directly.';
  if (!workout) return 'Your trainer will assign the default 6 Month plan after assessment.';
  if (workout.assignmentStatus === 'completed') return 'Completed today - review your workout history and progress.';
  if (workout.assignmentType === 'rest') return 'Recovery guidance is visible in your main plan today.';
  if (workout.exerciseCount <= 0) return 'Open your plan vault to review the next training block.';
  const suffix = workout.firstExercise ? ` - starts with ${workout.firstExercise}` : '';
  if (workout.assignmentType === 'homework') {
    return `Off-day plan work - ${workout.exerciseCount} exercise${workout.exerciseCount === 1 ? '' : 's'}${suffix}. No paid session deduction.`;
  }
  return `${workout.exerciseCount} exercise${workout.exerciseCount === 1 ? '' : 's'}${suffix}`;
}

function workoutTitle(
  workout?: CurrentClientWorkout | null,
  error?: boolean,
  loading?: boolean,
): string {
  if (loading) return 'Loading plan';
  if (workout?.title) return workout.title;
  return error ? 'Assignment unavailable' : 'Plan pending';
}

function workoutActionPath(workout?: CurrentClientWorkout | null): string {
  return workout?.isLoggable
    ? '/dashboard/client/log-workout?loadPlan=today'
    : '/dashboard/client/workouts';
}

function workoutActionLabel(workout?: CurrentClientWorkout | null): string {
  if (workout?.ctaLabel) return workout.ctaLabel;
  if (workout?.isLoggable) {
    return workout.assignmentType === 'trainer_session' ? 'Log Workout' : 'Log Assignment';
  }
  return 'View Plan';
}

function workoutActionAriaLabel(workout?: CurrentClientWorkout | null): string {
  return workout?.isLoggable ? 'Log today\'s assignment' : workout?.ctaLabel || 'View training plan';
}

const ClientCurrentWorkoutCard: React.FC<ClientCurrentWorkoutCardProps> = ({
  currentWorkout,
  currentWorkoutError,
  currentWorkoutLoading,
  onNavigate,
}) => (
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
      </WidgetList>
      <MutedText $top="0.75rem">
        {workoutDetail(currentWorkout, currentWorkoutError)}
      </MutedText>
    </CardInner>
  </WidgetCard>
);

export default ClientCurrentWorkoutCard;
