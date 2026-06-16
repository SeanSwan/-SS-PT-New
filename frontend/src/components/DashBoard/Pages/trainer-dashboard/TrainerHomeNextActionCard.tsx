/**
 * Blueprint: TrainerHomeNextActionCard
 * Purpose: surface the next trainable client session with one-tap Coach/Log actions.
 * Flow: session helper routes -> accessible buttons -> parent navigation callback.
 * Guardrails: no writes, no route mutation, hidden if the session lacks safe routes.
 */

import React from 'react';
import { BarChart3, Brain, CalendarDays, ClipboardList, Dumbbell } from 'lucide-react';
import type { TrainerSession } from '../../../../hooks/useTrainerTodaySessions';
import {
  buildTrainerSessionCoachRoute,
  buildTrainerSessionLogRoute,
  buildTrainerSessionPlannerRoute,
  getClientName,
  getSessionClientId,
  getSessionStartDate,
} from '../../../../hooks/useTrainerTodaySessions';
import { TRAINER_HOME_COACH_PATH } from './TrainerHomeQuickActions.config';
import {
  NextActionButton,
  NextActionButtons,
  NextActionCard,
  NextActionCopy,
  NextActionFlow,
  NextActionFlowDetail,
  NextActionFlowItem,
  NextActionFlowLabel,
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
const TRAINER_PROGRESS_PATH = '/dashboard/trainer/client-progress';
const TRAINER_OVERVIEW_PATH = '/dashboard/trainer/overview';

const buildTrainerSessionProgressRoute = (session: TrainerSession): string | null => {
  const clientId = getSessionClientId(session);
  if (!clientId) return null;

  return `${TRAINER_PROGRESS_PATH}?${new URLSearchParams({
    clientId,
    source: 'trainer-overview',
    returnTo: TRAINER_OVERVIEW_PATH,
  }).toString()}`;
};

const TrainerTodayFlow = () => (
  <NextActionFlow aria-label="Trainer today flow">
    <NextActionFlowItem>
      <NextActionFlowLabel>Coach</NextActionFlowLabel>
      <NextActionFlowDetail>Prime session</NextActionFlowDetail>
    </NextActionFlowItem>
    <NextActionFlowItem>
      <NextActionFlowLabel>Log</NextActionFlowLabel>
      <NextActionFlowDetail>Save proof</NextActionFlowDetail>
    </NextActionFlowItem>
    <NextActionFlowItem>
      <NextActionFlowLabel>Progress</NextActionFlowLabel>
      <NextActionFlowDetail>Review next</NextActionFlowDetail>
    </NextActionFlowItem>
  </NextActionFlow>
);

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

        <TrainerTodayFlow />

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
  const progressRoute = buildTrainerSessionProgressRoute(session);

  if (!coachRoute && !logRoute && !plannerRoute && !progressRoute) return null;

  return (
    <NextActionCard aria-label="Next trainer action" role="region">
      <NextActionCopy>
        <NextActionKicker>Next client</NextActionKicker>
        <NextActionTitle>{clientName}</NextActionTitle>
        <NextActionMeta>
          {formatSessionTime(session)} - coach, plan, log, then check progress from here.
        </NextActionMeta>
      </NextActionCopy>

      <TrainerTodayFlow />

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
        {progressRoute && (
          <NextActionButton
            type="button"
            onClick={() => onNavigate(progressRoute)}
            aria-label={`Review progress for ${clientName}`}
          >
            <BarChart3 size={16} aria-hidden="true" />
            Progress
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
