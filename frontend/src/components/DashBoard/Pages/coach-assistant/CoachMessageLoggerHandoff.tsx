import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { LoggerHandoffRow } from './CoachCommandLogEntry.styles';
import {
  buildCoachWorkoutLoggerHandoffFromText,
  storeCoachWorkoutLoggerHandoff,
} from './CoachCommandLoggerHandoff';

type CoachMessageLoggerHandoffProps = {
  text: string;
  workoutLoggerRoute?: string | null;
};

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

  return (
    <LoggerHandoffRow>
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
        Send to Logger
      </Link>
      <span>{loggerHandoff.exerciseCount} {exerciseLabel} staged for review</span>
      {handoffError && <span role="alert">{handoffError}</span>}
    </LoggerHandoffRow>
  );
}

export default CoachMessageLoggerHandoff;
