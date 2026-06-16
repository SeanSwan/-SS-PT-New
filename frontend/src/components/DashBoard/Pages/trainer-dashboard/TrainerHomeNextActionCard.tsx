/**
 * Blueprint: TrainerHomeNextActionCard
 * Purpose: surface the next trainable client session with one-tap Coach/Log actions.
 * Flow: session helper routes -> accessible buttons -> parent navigation callback.
 * Guardrails: no writes, no route mutation, hidden if the session lacks safe routes.
 */

import React from 'react';
import { Brain, CalendarDays, ClipboardList, Dumbbell } from 'lucide-react';
import type { TrainerSession } from '../../../../hooks/useTrainerTodaySessions';
import {
  buildTrainerSessionCoachRoute,
  buildTrainerSessionLogRoute,
  buildTrainerSessionPlannerRoute,
  getClientName,
  getSessionStartDate,
} from '../../../../hooks/useTrainerTodaySessions';
import { TRAINER_HOME_COACH_PATH } from './TrainerHomeQuickActions.config';
import {
  NextActionButton,
  NextActionButtons,
  NextActionCard,
  NextActionCopy,
  NextActionKicker,
  NextActionMeta,
  NextActionTitle,
} from './TrainerHomeNextActionCard.styles';

interface TrainerHomeNextActionCardProps {
  session: TrainerSession | null;
  coachPath?: string;
  onNavigate: (path: string) => void;
}

const formatSessionTime = (session: TrainerSession): string => {
  const start = getSessionStartDate(session);
  if (!start) return 'Time TBD';

  return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TRAINER_CLIENTS_PATH = '/dashboard/trainer/clients';
const TRAINER_LOG_WORKOUT_PATH = `${TRAINER_CLIENTS_PATH}?intent=log_workout`;
const TRAINER_SCHEDULE_PATH = '/dashboard/trainer/schedule';

const TrainerHomeNextActionCard: React.FC<TrainerHomeNextActionCardProps> = ({
  session,
  coachPath = TRAINER_HOME_COACH_PATH,
  onNavigate,
}) => {
  if (!session) {
    return (
      <NextActionCard aria-label="Next trainer action" role="region">
        <NextActionCopy>
          <NextActionKicker>Build the day</NextActionKicker>
          <NextActionTitle>Start with a workout log</NextActionTitle>
          <NextActionMeta>
            Pick a client to log now, ask Coach for triage, or plan the next opening.
          </NextActionMeta>
        </NextActionCopy>

        <NextActionButtons>
          <NextActionButton
            type="button"
            $variant="primary"
            onClick={() => onNavigate(TRAINER_LOG_WORKOUT_PATH)}
            aria-label="Pick a client to log a workout"
          >
            <Dumbbell size={16} aria-hidden="true" />
            Log Workout
          </NextActionButton>
          <NextActionButton
            type="button"
            onClick={() => onNavigate(TRAINER_SCHEDULE_PATH)}
            aria-label="Plan trainer day in schedule"
          >
            <CalendarDays size={16} aria-hidden="true" />
            Plan Day
          </NextActionButton>
          <NextActionButton
            type="button"
            onClick={() => onNavigate(coachPath)}
            aria-label="Ask Coach for trainer day triage"
          >
            <Brain size={16} aria-hidden="true" />
            Ask Coach
          </NextActionButton>
        </NextActionButtons>
      </NextActionCard>
    );
  }

  const clientName = getClientName(session);
  const coachRoute = buildTrainerSessionCoachRoute(session);
  const logRoute = buildTrainerSessionLogRoute(session);
  const plannerRoute = buildTrainerSessionPlannerRoute(session);

  if (!coachRoute && !logRoute && !plannerRoute) return null;

  return (
    <NextActionCard aria-label="Next trainer action" role="region">
      <NextActionCopy>
        <NextActionKicker>Next client</NextActionKicker>
        <NextActionTitle>{clientName}</NextActionTitle>
        <NextActionMeta>
          {formatSessionTime(session)} - coach it, plan it, or log it from here.
        </NextActionMeta>
      </NextActionCopy>

      <NextActionButtons>
        {coachRoute && (
          <NextActionButton
            type="button"
            $variant="primary"
            onClick={() => onNavigate(coachRoute)}
            aria-label={`Coach next session for ${clientName}`}
          >
            <Brain size={16} aria-hidden="true" />
            Coach
          </NextActionButton>
        )}
        {plannerRoute && (
          <NextActionButton
            type="button"
            onClick={() => onNavigate(plannerRoute)}
            aria-label={`Plan next session for ${clientName}`}
          >
            <ClipboardList size={16} aria-hidden="true" />
            Plan
          </NextActionButton>
        )}
        {logRoute && (
          <NextActionButton
            type="button"
            onClick={() => onNavigate(logRoute)}
            aria-label={`Log next session for ${clientName}`}
          >
            <Dumbbell size={16} aria-hidden="true" />
            Log
          </NextActionButton>
        )}
        <NextActionButton
          type="button"
          onClick={() => onNavigate(TRAINER_SCHEDULE_PATH)}
          aria-label="Open full trainer schedule"
        >
          <CalendarDays size={16} aria-hidden="true" />
          Schedule
        </NextActionButton>
      </NextActionButtons>
    </NextActionCard>
  );
};

export default TrainerHomeNextActionCard;
