import React from 'react';
import { Archive, Dumbbell, Gauge, Timer } from 'lucide-react';
import type { WorkoutHistoryEntry } from './Analytics';
import {
  HistoryCard,
  HistoryCardTop,
  HistoryCount,
  HistoryDate,
  HistoryEmpty,
  HistoryGrid,
  HistoryHeader,
  HistoryMeta,
  HistoryPill,
  HistorySection,
  HistoryText,
  HistoryTitle,
  HistoryType,
} from './EnhancedClientProgressWorkoutHistory.styles';

interface EnhancedClientProgressWorkoutHistoryProps {
  workouts: WorkoutHistoryEntry[];
}

const formatWorkoutDate = (value: string) => {
  if (!value) return 'Date not logged';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not logged';
  return date.toLocaleDateString();
};

const formatDuration = (duration: number) => {
  if (!Number.isFinite(duration) || duration <= 0) return 'Duration not logged';
  return `${Math.round(duration)} min`;
};

const formatIntensity = (intensity: number) => {
  if (!Number.isFinite(intensity) || intensity <= 0) return 'Intensity not logged';
  return `Intensity ${Math.round(intensity)}`;
};

const formatExerciseCount = (exerciseCount?: number) => {
  if (!Number.isFinite(exerciseCount) || !exerciseCount || exerciseCount <= 0) return null;
  return `${Math.round(exerciseCount)} exercise${Math.round(exerciseCount) === 1 ? '' : 's'}`;
};

const formatVolume = (totalVolume?: number) => {
  if (!Number.isFinite(totalVolume) || !totalVolume || totalVolume <= 0) return null;
  return `${Math.round(totalVolume).toLocaleString()} lb volume`;
};

const EnhancedClientProgressWorkoutHistory: React.FC<EnhancedClientProgressWorkoutHistoryProps> = ({
  workouts,
}) => (
  <HistorySection aria-labelledby="trainer-recent-workout-history">
    <HistoryHeader>
      <HistoryTitle id="trainer-recent-workout-history">
        <Archive size={18} />
        Recent Workout History
      </HistoryTitle>
      <HistoryCount>{workouts.length} logged</HistoryCount>
    </HistoryHeader>

    {workouts.length === 0 ? (
      <HistoryEmpty>
        No recent workouts found yet. Log a workout from My Clients or the schedule to start building this client record.
      </HistoryEmpty>
    ) : (
      <HistoryGrid>
        {workouts.slice(0, 6).map((workout) => (
          <HistoryCard key={`${workout.date}-${workout.type}`}>
            <HistoryCardTop>
              <HistoryType>{workout.type || 'Workout'}</HistoryType>
              <HistoryDate>{formatWorkoutDate(workout.date)}</HistoryDate>
            </HistoryCardTop>

            <HistoryMeta>
              <HistoryPill>
                <Timer size={13} />
                {formatDuration(workout.duration)}
              </HistoryPill>
              <HistoryPill>
                <Gauge size={13} />
                {formatIntensity(workout.intensity)}
              </HistoryPill>
              {formatExerciseCount(workout.exerciseCount) ? (
                <HistoryPill>
                  <Dumbbell size={13} />
                  {formatExerciseCount(workout.exerciseCount)}
                </HistoryPill>
              ) : null}
            </HistoryMeta>

            {formatVolume(workout.totalVolume) ? (
              <HistoryText>{formatVolume(workout.totalVolume)}</HistoryText>
            ) : null}

            {workout.exercises?.length ? (
              <HistoryText>
                <Dumbbell size={13} aria-hidden="true" /> {workout.exercises.slice(0, 4).join(', ')}
              </HistoryText>
            ) : null}

            {workout.notes ? <HistoryText>{workout.notes}</HistoryText> : null}
          </HistoryCard>
        ))}
      </HistoryGrid>
    )}
  </HistorySection>
);

export default EnhancedClientProgressWorkoutHistory;
