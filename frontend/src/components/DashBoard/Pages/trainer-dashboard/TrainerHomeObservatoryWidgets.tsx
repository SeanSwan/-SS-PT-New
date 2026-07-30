import React from 'react';
import { Brain, CalendarDays, ClipboardList } from 'lucide-react';
import type { TrainerSession } from '../../../../hooks/useTrainerTodaySessions';
import {
  buildTrainerSessionCoachRoute,
  buildTrainerSessionBuildPlanRoute,
  getClientName,
  getSessionStartDate,
} from '../../../../hooks/useTrainerTodaySessions';
import {
  TRAINER_OBSERVATORY_MOBILE_DOCK,
} from './TrainerHomeObservatoryData';
import {
  MobileDockButton,
  TrainerMobileDock,
  WidgetButton,
  WidgetButtonRow,
  WidgetCard,
  WidgetKicker,
  WidgetMeta,
  WidgetStat,
  WidgetStatLabel,
  WidgetStatList,
  WidgetStatValue,
  WidgetTitle,
  WidgetsStack,
} from './TrainerHomeObservatoryWidgets.styles';

interface TrainerHomeWidgetStats {
  clientsToday: number;
  sessionsToday: number;
  completionRate: number;
  hoursLogged: number;
}

interface TrainerHomeObservatoryWidgetsProps {
  stats: TrainerHomeWidgetStats;
  loading: boolean;
  nextSession: TrainerSession | null;
  coachPath: string;
  onNavigate: (path: string) => void;
}

const formatSessionTime = (session: TrainerSession | null): string => {
  if (!session) return 'Ready when the roster needs attention';
  const start = getSessionStartDate(session);
  if (!start) return 'Time TBD';

  return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const valueOrDash = (loading: boolean, value: string | number): string | number => (loading ? '-' : value);

const TrainerHomeObservatoryWidgets: React.FC<TrainerHomeObservatoryWidgetsProps> = ({
  stats,
  loading,
  nextSession,
  coachPath,
  onNavigate,
}) => {
  const nextClientName = nextSession ? getClientName(nextSession) : 'Build the day';
  const coachRoute = nextSession ? buildTrainerSessionCoachRoute(nextSession) : coachPath;
  const buildPlanRoute = nextSession ? buildTrainerSessionBuildPlanRoute(nextSession) : '/dashboard/trainer/workout-planner';

  return (
    <WidgetsStack aria-label="Trainer homepage widgets">
      <WidgetCard aria-label="Trainer command focus">
        <WidgetKicker>Command focus</WidgetKicker>
        <WidgetTitle>{nextClientName}</WidgetTitle>
        <WidgetMeta>{formatSessionTime(nextSession)}. Keep the trainer loop moving from Coach to plan to logged proof.</WidgetMeta>
        <WidgetButtonRow>
          <WidgetButton
            type="button"
            $primary
            onClick={() => onNavigate(coachRoute ?? coachPath)}
            aria-label="Prime next client in Swan Coach"
          >
            <Brain size={15} aria-hidden="true" />
            Prime
          </WidgetButton>
          <WidgetButton
            type="button"
            onClick={() => onNavigate(buildPlanRoute ?? '/dashboard/trainer/workout-planner')}
            aria-label="Open trainer Workout Planner"
          >
            <ClipboardList size={15} aria-hidden="true" />
            Build
          </WidgetButton>
        </WidgetButtonRow>
      </WidgetCard>

      <WidgetCard aria-label="Trainer readiness snapshot">
        <WidgetKicker>Readiness snapshot</WidgetKicker>
        <WidgetTitle>Today from real sessions</WidgetTitle>
        <WidgetStatList>
          <WidgetStat>
            <WidgetStatLabel>Clients with sessions</WidgetStatLabel>
            <WidgetStatValue>{valueOrDash(loading, stats.clientsToday)}</WidgetStatValue>
          </WidgetStat>
          <WidgetStat>
            <WidgetStatLabel>Booked sessions</WidgetStatLabel>
            <WidgetStatValue>{valueOrDash(loading, stats.sessionsToday)}</WidgetStatValue>
          </WidgetStat>
          <WidgetStat>
            <WidgetStatLabel>Completion rate</WidgetStatLabel>
            <WidgetStatValue>{valueOrDash(loading, `${stats.completionRate}%`)}</WidgetStatValue>
          </WidgetStat>
          <WidgetStat>
            <WidgetStatLabel>Hours coached</WidgetStatLabel>
            <WidgetStatValue>{valueOrDash(loading, stats.hoursLogged.toFixed(1))}</WidgetStatValue>
          </WidgetStat>
        </WidgetStatList>
      </WidgetCard>

      <WidgetCard aria-label="Trainer tool chain">
        <WidgetKicker>Trainer tool chain</WidgetKicker>
        <WidgetTitle>Low-click workflow dock</WidgetTitle>
        <WidgetMeta>Log, roster, Coach, progress, and messages stay one tap away on phone widths.</WidgetMeta>
        <WidgetButtonRow>
          <WidgetButton
            type="button"
            $primary
            onClick={() => onNavigate('/dashboard/trainer/clients?intent=log_workout')}
            aria-label="Open trainer roster for workout logging"
          >
            <CalendarDays size={15} aria-hidden="true" />
            Roster
          </WidgetButton>
          <WidgetButton
            type="button"
            onClick={() => onNavigate('/dashboard/trainer/client-progress')}
            aria-label="Open trainer client progress board"
          >
            Progress
          </WidgetButton>
        </WidgetButtonRow>
      </WidgetCard>

      <TrainerMobileDock aria-label="Trainer mobile quick actions">
        {TRAINER_OBSERVATORY_MOBILE_DOCK.map(({ label, detail, path, Icon, primary }) => {
          const actionPath = label === 'Coach' ? coachPath : path;

          return (
            <MobileDockButton
              key={label}
              type="button"
              $primary={primary}
              onClick={() => onNavigate(actionPath)}
              aria-label={`Mobile trainer action: ${label}`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
              <span>{detail}</span>
            </MobileDockButton>
          );
        })}
      </TrainerMobileDock>
    </WidgetsStack>
  );
};

export default TrainerHomeObservatoryWidgets;
