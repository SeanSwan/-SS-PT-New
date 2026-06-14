import { useMemo, useState } from 'react';
import { ArrowRight, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  buildCoachWorkoutLoggerHandoffFromText,
  storeCoachWorkoutLoggerHandoff,
} from './CoachCommandLoggerHandoff';
import { CoachLoggerHandoffCard } from './CoachMessageLoggerHandoff.styles';

type CoachMessageLoggerHandoffProps = {
  text: string;
  workoutLoggerRoute?: string | null;
};

function formatExercisePrescription(exercise: {
  sets: number;
  reps: number;
  weight?: number;
}): string {
  const base = `${exercise.sets} x ${exercise.reps}`;
  return exercise.weight ? `${base} @ ${exercise.weight} lbs` : base;
}

function CoachMessageLoggerHandoff({
  text,
  workoutLoggerRoute,
}: CoachMessageLoggerHandoffProps) {
  const [handoffError, setHandoffError] = useState('');
  const loggerHandoff = useMemo(
    () => (workoutLoggerRoute ? buildCoachWorkoutLoggerHandoffFromText(text) : null),
    [text, workoutLoggerRoute],
  );

  if (!loggerHandoff || !workoutLoggerRoute) return null;

  const exerciseLabel = loggerHandoff.exerciseCount === 1 ? 'exercise' : 'exercises';
  const previewExercises = loggerHandoff.payload.exercises.slice(0, 3);
  const hiddenExerciseCount = Math.max(loggerHandoff.exerciseCount - previewExercises.length, 0);

  return (
    <CoachLoggerHandoffCard aria-label="Coach workout handoff">
      <div className="handoff-head">
        <span className="handoff-icon" aria-hidden="true"><Dumbbell size={16} /></span>
        <div>
          <strong>Workout ready for review</strong>
          <span>{loggerHandoff.exerciseCount} {exerciseLabel} parsed from this visible answer. Review only - nothing logs until you save it.</span>
        </div>
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
          aria-label={`Send ${loggerHandoff.exerciseCount} ${exerciseLabel} to Logger`}
          onClick={(event) => {
            const staged = storeCoachWorkoutLoggerHandoff(loggerHandoff.payload);
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

export default CoachMessageLoggerHandoff;
