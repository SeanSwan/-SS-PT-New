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

function assignmentLabel(type?: string): string {
  if (type === 'trainer_session') return 'Trainer Session';
  if (type === 'active_recovery') return 'Active Recovery';
  if (type === 'rest') return 'Rest Day';
  if (type === 'assessment') return 'Assessment';
  return 'Coach Homework';
}

function workoutDetail(workout?: CurrentClientWorkout | null, error?: boolean): string {
  if (error) return 'Refresh this page or open the workout logger directly.';
  if (!workout) return 'Your trainer will assign the default 6 Month plan after assessment.';
  if (workout.assignmentType === 'rest') return 'Recovery guidance is visible in your main plan today.';
  if (workout.exerciseCount <= 0) return 'Open your plan vault to review the next training block.';
  const suffix = workout.firstExercise ? ` - starts with ${workout.firstExercise}` : '';
  return `${workout.exerciseCount} exercise${workout.exerciseCount === 1 ? '' : 's'}${suffix}`;
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
            Today's Assignment
          </SectionKicker>
          <SectionTitle>
            {currentWorkoutLoading
              ? 'Loading plan'
              : currentWorkout?.title || (currentWorkoutError ? 'Assignment unavailable' : 'Plan pending')}
          </SectionTitle>
        </div>
        <SmallButton
          type="button"
          aria-label={currentWorkout?.isLoggable ? 'Log today\'s assignment' : 'View training plan'}
          onClick={() => onNavigate(
            currentWorkout?.isLoggable
              ? '/dashboard/client/log-workout?loadPlan=today'
              : '/dashboard/client/workouts',
          )}
        >
          {currentWorkout?.ctaLabel || 'View Plan'}
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
