/**
 * Blueprint: ActivePlanContextStrip
 * Parent: WorkoutLogger
 * Purpose: show the loaded plan/assignment title, week, day, exercise count,
 * and status while the user is logging. Reads only PlannedAssignment fields and
 * renders nothing until a real assignment is loaded.
 */
import React from 'react';
import styled from 'styled-components';
import { CalendarRange, Layers, ListChecks, Target } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';
import type { PlannedAssignment } from './WorkoutLogger.localTypes';
import WorkoutLoggerEmptyPlanState, {
  type WorkoutLoggerPlanLoadOutcome,
} from './WorkoutLoggerEmptyPlanState';

interface ActivePlanContextStripProps {
  assignment: PlannedAssignment | null;
  /** C4b: why the plan loader came back empty — renders the in-page state. */
  planLoadOutcome?: WorkoutLoggerPlanLoadOutcome | null;
  isClientSelfMode?: boolean;
}

interface PlanFact {
  id: string;
  icon: React.ElementType;
  label: string;
}

interface PlanContextView {
  title: string;
  status: string | null;
  facts: PlanFact[];
  firstExercise: string | null;
}

const toLabel = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
};

const formatStatus = (status: string): string => {
  const spaced = status.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

const buildDayLabel = (assignment: PlannedAssignment): string | null => {
  const explicitLabel = toLabel(assignment.dayLabel);
  if (explicitLabel) return explicitLabel;

  const dayNumber = toLabel(assignment.dayNumber);
  return dayNumber ? `Day ${dayNumber}` : null;
};

const getExerciseCount = (assignment: PlannedAssignment): number | null => (
  typeof assignment.exerciseCount === 'number' && assignment.exerciseCount > 0
    ? assignment.exerciseCount
    : null
);

const buildPlanFacts = (assignment: PlannedAssignment): PlanFact[] => {
  const facts: PlanFact[] = [];
  const week = toLabel(assignment.weekNumber);
  const dayLabel = buildDayLabel(assignment);
  const exerciseCount = getExerciseCount(assignment);

  if (week) facts.push({ id: 'week', icon: CalendarRange, label: `Week ${week}` });
  if (dayLabel) facts.push({ id: 'day', icon: Layers, label: dayLabel });
  if (exerciseCount) {
    const suffix = exerciseCount === 1 ? '' : 's';
    facts.push({ id: 'exercise-count', icon: ListChecks, label: `${exerciseCount} exercise${suffix}` });
  }

  return facts;
};

const buildPlanContextView = (assignment: PlannedAssignment | null): PlanContextView | null => {
  if (!assignment) return null;

  const titleRaw = toLabel(assignment.title) || toLabel(assignment.dayLabel);
  const title = titleRaw || "Today's Plan";
  const status = toLabel(assignment.status);
  const facts = buildPlanFacts(assignment);
  const firstExercise = toLabel(assignment.firstExerciseName);

  const hasFacts = Boolean(facts.length || status);
  if (!titleRaw && !hasFacts) return null;

  return { title, status, facts, firstExercise };
};

const ActivePlanContextStrip: React.FC<ActivePlanContextStripProps> = React.memo(({
  assignment,
  planLoadOutcome = null,
  isClientSelfMode = false,
}) => {
  const planContext = buildPlanContextView(assignment);
  // C4b: no plan context but the loader REPORTED why → persistent state
  // instead of the old toast-then-blank dead end.
  if (!planContext) {
    return planLoadOutcome
      ? <WorkoutLoggerEmptyPlanState outcome={planLoadOutcome} isClientSelfMode={isClientSelfMode} />
      : null;
  }

  return (
    <Strip role="note" aria-label="Active plan context">
      <AccentBar aria-hidden="true" />
      <Body>
        <TitleRow>
          <Target size={16} aria-hidden="true" />
          <Title title={planContext.title}>{planContext.title}</Title>
          {planContext.status && <StatusPill>{formatStatus(planContext.status)}</StatusPill>}
        </TitleRow>
        {planContext.facts.length > 0 && (
          <Facts>
            {planContext.facts.map(({ id, icon: Icon, label }) => (
              <Fact key={id}>
                <Icon size={13} aria-hidden="true" />
                {label}
              </Fact>
            ))}
          </Facts>
        )}
        {planContext.firstExercise && <Lead>Starts with {planContext.firstExercise}</Lead>}
      </Body>
    </Strip>
  );
});

ActivePlanContextStrip.displayName = 'ActivePlanContextStrip';
export default ActivePlanContextStrip;

const Strip = styled.div`
  position: relative;
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  padding: 0.875rem 1.125rem 0.875rem 1.25rem;
  background:
    linear-gradient(135deg, ${withAlpha(CS.gaming, 0.1)}, ${withAlpha(CS.secondary, 0.06)}),
    ${CS.card};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid ${CS.glassBorder};
  border-radius: 8px;
  overflow: hidden;

  @media (max-width: 430px) {
    padding: 0.75rem 0.875rem 0.75rem 1rem;
    margin-bottom: 1.25rem;
  }
`;

const AccentBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, ${CS.gaming}, ${CS.accent});
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;

  svg { color: ${CS.gaming}; flex-shrink: 0; }
`;

const Title = styled.h3`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0;
  color: ${CS.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`;

const StatusPill = styled.span`
  flex-shrink: 0;
  margin-left: auto;
  padding: 0.2rem 0.6rem;
  border-radius: 2rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  color: ${CS.glowLight};
  background: ${withAlpha(CS.gaming, 0.14)};
  border: 1px solid ${withAlpha(CS.gaming, 0.3)};
`;

const Facts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
`;

const Fact = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${CS.textSecondary};

  svg { color: ${CS.accent}; flex-shrink: 0; }
`;

const Lead = styled.p`
  margin: 0;
  font-size: 0.78rem;
  color: ${CS.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
