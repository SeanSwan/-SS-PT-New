/**
 * FILE: TrainerHomeTab.tsx
 * PURPOSE: Canonical trainer landing observatory for coaching work.
 * FLOW: auth/profile/session data -> observatory hero, next action, KPIs, sessions, widgets.
 * REPLACES: TrainerOverviewPage at /dashboard/trainer/overview.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, Clock, CheckCircle, Dumbbell, Calendar, Brain, ClipboardList } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import { DashboardBackgroundSurface } from '../../shared/DashboardBackgroundStudio';
import {
  buildTrainerSessionCoachRoute,
  buildTrainerSessionLogRoute,
  buildTrainerSessionBuildPlanRoute,
  getClientName,
  getNextActionableTrainerSession,
  getSessionStartDate,
  useTrainerTodaySessions,
} from '../../../../hooks/useTrainerTodaySessions';
import TrainerHomeNextActionCard from './TrainerHomeNextActionCard';
import TrainerMyBookCard from './TrainerMyBookCard';
import TrainerHomeObservatoryHero from './TrainerHomeObservatoryHero';
import TrainerHomeObservatoryWidgets from './TrainerHomeObservatoryWidgets';
import TrainerInterventionQueue from './TrainerInterventionQueue';
import {
  buildTrainerHomeCoachPath,
  TRAINER_HOME_QUICK_ACTIONS,
} from './TrainerHomeQuickActions.config';
import {
  ActionCard,
  ActionDetail,
  ActionIcon,
  ActionLabel,
  ActionOverline,
  ActionText,
  QuickGrid,
  SectionHeading,
} from './TrainerHomeQuickActions.styles';
import {
  BookBtn,
  EmptyState,
  KpiCard,
  KpiLabel,
  KpiStrip,
  KpiValue,
  SessionsCard,
  SessionsHeading,
  SessionClient,
  SessionActions,
  SessionLogButton,
  SessionsOverflow,
  SessionsOverflowNote,
  SessionRow,
  SessionRowSkeleton,
  SessionTime,
  StatusBadge,
} from './TrainerHomeTab.styles';
import {
  TrainerHomeMainGrid,
  TrainerHomePageShell,
  TrainerHomePrimaryColumn,
  TrainerHomeSideColumn,
} from './TrainerHomeTab.layoutStyles';

const KPI_COLORS = [
  'var(--accent-primary, #60C0F0)',
  'var(--accent-secondary, #8B5CF6)',
  'var(--accent-gold, #C6A84B)',
  'var(--success, #22c55e)',
] as const;

const MAX_TRAINER_HOME_SESSIONS = 5;

const TrainerHomeTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useGamificationData();
  const { sessions, loading, error, stats } = useTrainerTodaySessions();

  const trainerName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'Trainer';
  const trainerHandle = user?.username ? `@${user.username}` : undefined;
  const trainerPhotoUrl = user?.profileImageUrl ?? user?.photo ?? null;
  const level = profile.data?.level ?? 1;
  const visibleSessions = sessions.slice(0, MAX_TRAINER_HOME_SESSIONS);
  const hiddenSessionCount = Math.max(0, sessions.length - visibleSessions.length);
  const nextActionableSession = React.useMemo(
    () => getNextActionableTrainerSession(sessions),
    [sessions],
  );
  const trainerHomeCoachPath = React.useMemo(() => buildTrainerHomeCoachPath({
    sessionsToday: stats.sessionsToday,
    clientsToday: stats.clientsToday,
    completionRate: stats.completionRate,
    hasNextActionableSession: Boolean(nextActionableSession),
  }), [nextActionableSession, stats.clientsToday, stats.completionRate, stats.sessionsToday]);

  const kpiData = [
    { value: loading ? '-' : stats.clientsToday, label: 'Clients Today', Icon: Users, color: KPI_COLORS[0] },
    { value: loading ? '-' : stats.sessionsToday, label: 'Sessions', Icon: CalendarDays, color: KPI_COLORS[1] },
    { value: loading ? '-' : stats.hoursLogged.toFixed(1), label: 'Hours Logged', Icon: Clock, color: KPI_COLORS[2] },
    { value: loading ? '-' : `${stats.completionRate}%`, label: 'Completion', Icon: CheckCircle, color: KPI_COLORS[3] },
  ];

  return (
    <DashboardBackgroundSurface>
    <TrainerHomePageShell>
      <TrainerHomeObservatoryHero
        trainerName={trainerName}
        trainerHandle={trainerHandle}
        trainerPhotoUrl={trainerPhotoUrl}
        level={level}
        loading={loading}
        stats={stats}
      />

      <TrainerHomeMainGrid>
        <TrainerHomePrimaryColumn>
          <TrainerHomeNextActionCard
            session={nextActionableSession}
            coachPath={trainerHomeCoachPath}
            onNavigate={navigate}
          />

          <KpiStrip aria-label="Today's key metrics">
            {kpiData.map(({ value, label, Icon, color }, i) => (
              <KpiCard key={label} $index={i}>
                <KpiValue>
                  <Icon size={16} color={color} aria-hidden="true" />
                  {value}
                </KpiValue>
                <KpiLabel>{label}</KpiLabel>
              </KpiCard>
            ))}
          </KpiStrip>

          {/* Promoted from the rail (Kimi K3): the critical-compliance radar is
              the trainer's real signature value, not a rail afterthought. */}
          <TrainerInterventionQueue />

          <SessionsCard>
            <SessionsHeading>Today&apos;s Sessions</SessionsHeading>
            {loading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SessionRowSkeleton key={i} aria-hidden="true" />
                ))}
              </>
            ) : error ? (
              <EmptyState>{error}</EmptyState>
            ) : sessions.length === 0 ? (
              <EmptyState>
                No sessions scheduled today.
                <BookBtn type="button" onClick={() => navigate('/dashboard/trainer/schedule')} aria-label="Open schedule">
                  <Calendar size={15} aria-hidden="true" />
                  Open Schedule
                </BookBtn>
              </EmptyState>
            ) : (
              <>
                {visibleSessions.map(s => {
                  const startDate = getSessionStartDate(s);
                  const coachRoute = buildTrainerSessionCoachRoute(s);
                  const logRoute = buildTrainerSessionLogRoute(s);
                  const buildPlanRoute = buildTrainerSessionBuildPlanRoute(s);
                  const canLog = Boolean(logRoute && s.status !== 'completed' && s.status !== 'cancelled');
                  const canDictate = Boolean(coachRoute && s.status !== 'completed' && s.status !== 'cancelled');
                  const canBuildPlan = Boolean(buildPlanRoute && s.status !== 'completed' && s.status !== 'cancelled');

                  return (
                    <SessionRow key={s.id}>
                      <div>
                        <SessionClient>{getClientName(s)}</SessionClient>
                        <SessionTime>
                          {startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                        </SessionTime>
                      </div>
                      <SessionActions>
                        <StatusBadge $status={s.status}>{s.status ?? 'upcoming'}</StatusBadge>
                        {canDictate && (
                          <SessionLogButton type="button" onClick={() => coachRoute && navigate(coachRoute)} aria-label={`Dictate workout with Swan Coach for ${getClientName(s)}`}>
                            <Brain size={14} aria-hidden="true" />
                            Coach
                          </SessionLogButton>
                        )}
                        {canBuildPlan && (
                          <SessionLogButton type="button" onClick={() => buildPlanRoute && navigate(buildPlanRoute)} aria-label={`Build plan for ${getClientName(s)}`}>
                            <ClipboardList size={14} aria-hidden="true" />
                            Build
                          </SessionLogButton>
                        )}
                        {canLog && (
                          <SessionLogButton type="button" onClick={() => logRoute && navigate(logRoute)} aria-label={`Log workout for ${getClientName(s)}`}>
                            <Dumbbell size={14} aria-hidden="true" />
                            Log
                          </SessionLogButton>
                        )}
                      </SessionActions>
                    </SessionRow>
                  );
                })}
                {hiddenSessionCount > 0 && (
                  <SessionsOverflow>
                    <SessionsOverflowNote>Showing {visibleSessions.length} of {sessions.length} sessions</SessionsOverflowNote>
                    <BookBtn type="button" onClick={() => navigate('/dashboard/trainer/schedule')} aria-label={`View all ${sessions.length} sessions`}>
                      <Calendar size={15} aria-hidden="true" />
                      View all {sessions.length} sessions
                    </BookBtn>
                  </SessionsOverflow>
                )}
              </>
            )}
          </SessionsCard>
        </TrainerHomePrimaryColumn>

        <TrainerHomeSideColumn>
          <TrainerMyBookCard />
          <TrainerHomeObservatoryWidgets
            stats={stats}
            loading={loading}
            nextSession={nextActionableSession}
            coachPath={trainerHomeCoachPath}
            onNavigate={navigate}
          />
          <SectionHeading>Quick Actions</SectionHeading>
          <QuickGrid>
            {TRAINER_HOME_QUICK_ACTIONS.map(({ label, detail, overline, primary, Icon, path, tone, i }) => {
              const actionPath = label === 'Ask Coach' ? trainerHomeCoachPath : path;

              return (
                <ActionCard key={label} type="button" $tone={tone} $primary={primary} $index={i} onClick={() => navigate(actionPath)} aria-label={primary ? `Primary trainer action: ${label}` : label}>
                  <ActionIcon $tone={tone} $primary={primary} aria-hidden="true"><Icon size={18} /></ActionIcon>
                  <ActionText>
                    {overline && <ActionOverline>{overline}</ActionOverline>}
                    <ActionLabel $primary={primary}>{label}</ActionLabel>
                    <ActionDetail>{detail}</ActionDetail>
                  </ActionText>
                </ActionCard>
              );
            })}
          </QuickGrid>
        </TrainerHomeSideColumn>
      </TrainerHomeMainGrid>
    </TrainerHomePageShell>
    </DashboardBackgroundSurface>
  );
};

export default TrainerHomeTab;
