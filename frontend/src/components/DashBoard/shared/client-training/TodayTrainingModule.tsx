/**
 * ============================================================================
 * FILE: TodayTrainingModule.tsx
 * PURPOSE: Render one canonical Today-training command surface on client Home.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * This presentation-only module consumes the normalized current-workout state
 * already owned by each Home host. It never fetches independently, so mounting
 * it cannot duplicate the canonical current-workout request.
 *
 * BLUEPRINT:
 * +--------------------------------------------------------------+
 * | Today's training                         [assignment status] |
 * | Plan | Week / Day | Revision | PDF truth                    |
 * | Exercise 1 | Exercise 2 | Exercise 3 | +N more              |
 * | [Log Workout] [View Plan] [View Schedule]                    |
 * +--------------------------------------------------------------+
 * DATA FLOW: CurrentClientWorkoutState prop -> pure view builder -> visible
 * facts and route callbacks. API CALLS: none; each host owns the single fetch.
 * EVENTS: Log -> assignment-bound logger; Plan -> workouts; Schedule -> calendar.
 * CHILDREN: styled semantic shell, fact pills, exercise list, action buttons.
 * ARCHITECTURE: Home host -> TodayTrainingModule -> buildTodayTrainingView.
 * GAMIFICATION: none directly; workout logging owns any earned progress.
 */
import React, { useMemo } from 'react';
import { CalendarDays, ClipboardList, Dumbbell, Route } from 'lucide-react';
import type { CurrentClientWorkoutState } from '../../Pages/client-dashboard/observatory/useCurrentClientWorkout';
import { buildTodayTrainingView, type TodayTrainingAction } from './TodayTrainingModule.logic';
import {
  ActionButton,
  Actions,
  Exercise,
  ExerciseList,
  Header,
  Kicker,
  Meta,
  MetaPill,
  Overflow,
  Shell,
  Status,
  Title,
} from './TodayTrainingModule.styles';

interface TodayTrainingModuleProps {
  state: CurrentClientWorkoutState;
  onNavigate: (path: string) => void;
}

const navigateAction = (
  action: TodayTrainingAction,
  onNavigate: (path: string) => void,
) => () => {
  if (!action.disabled) onNavigate(action.path);
};

const TodayTrainingModule: React.FC<TodayTrainingModuleProps> = ({ state, onNavigate }) => {
  const view = useMemo(() => buildTodayTrainingView(state), [state]);

  return (
    <Shell aria-label="Today's training" data-state={view.kind} aria-busy={view.kind === 'loading'}>
      <Header>
        <div>
          <Kicker><CalendarDays size={16} aria-hidden="true" /> Today&apos;s training</Kicker>
          <Title>{view.title}</Title>
        </div>
        <Status $kind={view.kind}>{view.statusLabel}</Status>
      </Header>

      <Meta aria-label="Assignment details">
        {view.planLabel && <MetaPill>{view.planLabel}</MetaPill>}
        {view.dayLabel && <MetaPill>{view.dayLabel}</MetaPill>}
        {view.revisionLabel && <MetaPill>{view.revisionLabel}</MetaPill>}
        <MetaPill>{view.pdfLabel}</MetaPill>
      </Meta>

      {view.exerciseNames.length > 0 && (
        <ExerciseList aria-label="Today's exercises">
          {view.exerciseNames.map((name) => <Exercise key={name}>{name}</Exercise>)}
          {view.overflowExerciseCount > 0 && <Overflow>+{view.overflowExerciseCount} more</Overflow>}
        </ExerciseList>
      )}

      <Actions>
        <ActionButton
          type="button"
          $primary
          disabled={view.logAction.disabled}
          onClick={navigateAction(view.logAction, onNavigate)}
          aria-label={view.logAction.label}
        >
          <Dumbbell size={16} aria-hidden="true" /> {view.logAction.label}
        </ActionButton>
        <ActionButton
          type="button"
          onClick={navigateAction(view.planAction, onNavigate)}
          aria-label={view.planAction.label}
        >
          <ClipboardList size={16} aria-hidden="true" /> {view.planAction.label}
        </ActionButton>
        <ActionButton
          type="button"
          onClick={navigateAction(view.scheduleAction, onNavigate)}
          aria-label={view.scheduleAction.label}
        >
          <Route size={16} aria-hidden="true" /> {view.scheduleAction.label}
        </ActionButton>
      </Actions>
    </Shell>
  );
};

export default TodayTrainingModule;