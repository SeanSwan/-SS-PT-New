import { useMemo } from 'react';

import { buildCoachWorkoutLoggerHandoffFromText } from './CoachCommandLoggerHandoff';
import CoachWorkoutLoggerReviewCard from './CoachWorkoutLoggerReviewCard';

type CoachMessageLoggerHandoffProps = {
  text: string;
  workoutLoggerRoute?: string | null;
  workoutLoggerScopeLabel?: string | null;
};

function CoachMessageLoggerHandoff({
  text,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
}: CoachMessageLoggerHandoffProps) {
  const loggerHandoff = useMemo(
    () => (workoutLoggerRoute ? buildCoachWorkoutLoggerHandoffFromText(text) : null),
    [text, workoutLoggerRoute],
  );

  if (!loggerHandoff || !workoutLoggerRoute) return null;

  return (
    <CoachWorkoutLoggerReviewCard
      handoff={loggerHandoff}
      workoutLoggerRoute={workoutLoggerRoute}
      workoutLoggerScopeLabel={workoutLoggerScopeLabel}
    />
  );
}

export default CoachMessageLoggerHandoff;
