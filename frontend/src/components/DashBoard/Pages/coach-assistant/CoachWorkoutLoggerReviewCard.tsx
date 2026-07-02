/**
 * Blueprint: Coach workout logger review card
 * Purpose: stage a parsed Coach workout for Logger review without creating a hidden workout write.
 */
import { useMemo, useState } from 'react';
import { ArrowRight, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { CoachWorkoutLoggerHandoff } from './CoachCommandLoggerHandoff';
import { storeCoachWorkoutLoggerHandoff } from './CoachCommandLoggerHandoff';
import { CoachLoggerHandoffCard } from './CoachMessageLoggerHandoff.styles';

type CoachWorkoutLoggerReviewCardProps = {
  handoff: CoachWorkoutLoggerHandoff;
  workoutLoggerRoute: string;
  workoutLoggerScopeLabel?: string | null;
};

function formatExercisePrescription(exercise: {
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
}): string {
  if (exercise.reps === 0 && exercise.notes?.trim()) return exercise.notes.trim();
  const base = `${exercise.sets} x ${exercise.reps}`;
  return exercise.weight ? `${base} @ ${exercise.weight} lbs` : base;
}

function workoutDateLabel(route: string): string {
  const query = route.includes('?') ? route.slice(route.indexOf('?')) : '';
  const params = new URLSearchParams(query);
  const sessionDate = params.get('sessionDate');
  if (sessionDate) {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sessionDate);
    const parsed = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(sessionDate);
    if (Number.isFinite(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return 'Scheduled session';
  }

  return params.get('loadPlan') === 'today' ? 'Today' : 'Logger review';
}

function CoachWorkoutLoggerReviewCard({
  handoff,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
}: CoachWorkoutLoggerReviewCardProps) {
  const [handoffError, setHandoffError] = useState('');
  const exerciseLabel = handoff.exerciseCount === 1 ? 'exercise' : 'exercises';
  const previewExercises = handoff.payload.exercises.slice(0, 3);
  const hiddenExerciseCount = Math.max(handoff.exerciseCount - previewExercises.length, 0);
  const scopeLabel = workoutLoggerScopeLabel?.trim() || 'Active logger';
  const dateLabel = useMemo(() => workoutDateLabel(workoutLoggerRoute), [workoutLoggerRoute]);

  return (
    <CoachLoggerHandoffCard aria-label="Coach workout handoff">
      <div className="handoff-head">
        <span className="handoff-icon" aria-hidden="true"><Dumbbell size={16} /></span>
        <div>
          <strong>Workout ready for review</strong>
          <span>{handoff.exerciseCount} {exerciseLabel} parsed from this visible answer. Nothing logs until you save it.</span>
        </div>
      </div>

      <div className="handoff-context" aria-label="Workout handoff target">
        <span><small>Target</small><strong>{scopeLabel}</strong></span>
        <span><small>Day</small><strong>{dateLabel}</strong></span>
        <span><small>Save step</small><strong>Logger save</strong></span>
      </div>

      <ul className="handoff-preview" aria-label="Parsed workout preview">
        {previewExercises.map((exercise) => (
          <li key={`${exercise.exerciseName}-${exercise.sets}-${exercise.reps}`}>
            <span className="exercise-name">{exercise.exerciseName}</span>
            <span className="exercise-dose">{formatExercisePrescription(exercise)}</span>
          </li>
        ))}
      </ul>

      <div className="handoff-actions">
        <Link
          to={workoutLoggerRoute}
          aria-label={`Review ${handoff.exerciseCount} ${exerciseLabel} in Logger`}
          onClick={(event) => {
            const staged = storeCoachWorkoutLoggerHandoff(handoff.payload, workoutLoggerRoute);
            if (!staged) {
              event.preventDefault();
              setHandoffError('Could not stage this workout. Try again before opening Logger.');
              return;
            }
            setHandoffError('');
          }}
        >
          <span>Review in Logger</span>
          <ArrowRight size={16} />
        </Link>
        {hiddenExerciseCount > 0 && (
          <span className="handoff-more">+{hiddenExerciseCount} more ready</span>
        )}
      </div>

      {handoffError && <span className="handoff-error" role="alert">{handoffError}</span>}
    </CoachLoggerHandoffCard>
  );
}

export default CoachWorkoutLoggerReviewCard;
