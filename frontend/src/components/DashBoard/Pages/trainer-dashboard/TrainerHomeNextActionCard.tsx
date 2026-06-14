/**
 * Blueprint: TrainerHomeNextActionCard
 * Purpose: surface the next trainable client session with one-tap Coach/Log actions.
 * Flow: session helper routes -> accessible buttons -> parent navigation callback.
 * Guardrails: no writes, no route mutation, hidden if the session lacks safe routes.
 */

import React from 'react';
import { Brain, CalendarDays, Dumbbell, Users } from 'lucide-react';
import type { TrainerSession } from '../../../../hooks/useTrainerTodaySessions';
import {
  buildTrainerSessionCoachRoute,
  buildTrainerSessionLogRoute,
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
          <NextActionTitle>Start with the next client move</NextActionTitle>
          <NextActionMeta>
            Fill the schedule, ask Coach for triage, or open your roster.
          </NextActionMeta>
        </NextActionCopy>

        <NextActionButtons>
          <NextActionButton
            type="button"
            $variant="primary"
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
          <NextActionButton
            type="button"
            onClick={() => onNavigate(TRAINER_CLIENTS_PATH)}
            aria-label="Open trainer client roster"
          >
            <Users size={16} aria-hidden="true" />
            Clients
          </NextActionButton>
        </NextActionButtons>
      </NextActionCard>
    );
  }

  const clientName = getClientName(session);
  const coachRoute = buildTrainerSessionCoachRoute(session);
  const logRoute = buildTrainerSessionLogRoute(session);

  if (!coachRoute && !logRoute) return null;

  return (
    <NextActionCard aria-label="Next trainer action" role="region">
      <NextActionCopy>
        <NextActionKicker>Next client</NextActionKicker>
        <NextActionTitle>{clientName}</NextActionTitle>
        <NextActionMeta>
          {formatSessionTime(session)} - start with Coach dictation or log the plan now.
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
