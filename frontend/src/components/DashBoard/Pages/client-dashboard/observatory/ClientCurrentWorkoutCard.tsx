/**
 * FILE: ClientCurrentWorkoutCard.tsx
 * PURPOSE: Current-workout call-to-action card for the client overview rail.
 */

import React from 'react';
import { Dumbbell } from 'lucide-react';
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
  if (!workout) return 'No active plan';
  const parts = [
    workout.weekNumber ? `Week ${workout.weekNumber}` : null,
    workout.dayNumber ? `Day ${workout.dayNumber}` : null,
    workout.dayLabel || null,
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'Ready now';
}

function workoutDetail(workout?: CurrentClientWorkout | null, error?: boolean): string {
  if (error) return 'Refresh this page or open the workout logger directly.';
  if (!workout) return 'Your trainer will assign the next plan after assessment.';
  if (workout.exerciseCount <= 0) return 'Open the logger to start this session.';
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
            <Dumbbell size={14} aria-hidden="true" />
            Current Workout
          </SectionKicker>
          <SectionTitle>
            {currentWorkoutLoading
              ? 'Loading plan'
              : currentWorkout?.title || (currentWorkoutError ? 'Workout unavailable' : 'Plan pending')}
          </SectionTitle>
        </div>
        <SmallButton
          type="button"
          aria-label="Start current workout"
          onClick={() => onNavigate('/dashboard/client/log-workout?loadPlan=today')}
        >
          Start
        </SmallButton>
      </WidgetHeader>
      <WidgetList>
        <WidgetRow>
          <WidgetLabel>{workoutPosition(currentWorkout)}</WidgetLabel>
          <WidgetValue>{currentWorkout?.exerciseCount || 0}</WidgetValue>
        </WidgetRow>
      </WidgetList>
      <MutedText $top="0.75rem">
        {workoutDetail(currentWorkout, currentWorkoutError)}
      </MutedText>
    </CardInner>
  </WidgetCard>
);

export default ClientCurrentWorkoutCard;
