/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: TrainerHomeTab                                   ║
 * ║  PURPOSE: Default trainer landing surface — ops cockpit      ║
 * ║  OWNER: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-09        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * REPLACES: TrainerOverviewPage at /dashboard/trainer/overview
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────┐
 * │ SwanCoachDockTrainer (always-on)         │
 * ├──────────────────────────────────────────┤
 * │ KPI Strip: Clients | Sessions | Hrs | %  │
 * ├──────────────────────────────────────────┤
 * │ Today's Sessions  (max 5)                │
 * ├──────────────────────────────────────────┤
 * │ Quick Actions (2×2)                      │
 * └──────────────────────────────────────────┘
 *
 * DATA FLOW:
 *   useAuth → trainerName
 *   useGamificationData → level (falls back to 1 if unavailable)
 *   useTrainerTodaySessions → sessions, loading, error, stats
 *   SwanCoachDockTrainer → no consent gate, always-on
 *   Quick Actions → navigate only, no data fetch
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, Clock, CheckCircle, Dumbbell, Calendar, Brain } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import {
  buildTrainerSessionCoachRoute,
  buildTrainerSessionLogRoute,
  getClientName,
  getNextActionableTrainerSession,
  getSessionStartDate,
  useTrainerTodaySessions,
} from '../../../../hooks/useTrainerTodaySessions';
import SwanCoachDockTrainer from './SwanCoachDockTrainer';
import TrainerHomeNextActionCard from './TrainerHomeNextActionCard';
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
  PageWrap,
  SessionsCard,
  SessionsHeading,
  SessionClient,
  SessionActions,
  SessionLogButton,
  SessionsOverflow,
  SessionsOverflowNote,
  SessionRow,
  SessionTime,
  StatusBadge,
} from './TrainerHomeTab.styles';

// ─── Animations ──────────────────────────────────────────────────────────────

const KPI_COLORS = [
  'var(--accent-primary, #60C0F0)',
  'var(--accent-secondary, #8B5CF6)',
  'var(--accent-gold, #C6A84B)',
  'var(--success, #22c55e)',
] as const;

const MAX_TRAINER_HOME_SESSIONS = 5;

// ─── Component ───────────────────────────────────────────────────────────────

const TrainerHomeTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useGamificationData();
  const { sessions, loading, error, stats } = useTrainerTodaySessions();

  const trainerName = user?.firstName ?? user?.username ?? 'Trainer';
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
    { value: loading ? '—' : stats.clientsToday,               label: 'Clients Today', Icon: Users,        color: KPI_COLORS[0] },
    { value: loading ? '—' : stats.sessionsToday,              label: 'Sessions',      Icon: CalendarDays, color: KPI_COLORS[1] },
    { value: loading ? '—' : stats.hoursLogged.toFixed(1),     label: 'Hours Logged',  Icon: Clock,        color: KPI_COLORS[2] },
    { value: loading ? '—' : `${stats.completionRate}%`,       label: 'Completion',    Icon: CheckCircle,  color: KPI_COLORS[3] },
  ];

  return (
    <PageWrap>
      {/* ── Swan Coach Dock ──────────────────────────────── */}
      <SwanCoachDockTrainer
        trainerName={trainerName}
        sessionCount={stats.sessionsToday}
        level={level}
        loading={loading}
        coachPath={trainerHomeCoachPath}
        onNavigate={navigate}
      />

      <TrainerHomeNextActionCard
        session={nextActionableSession}
        coachPath={trainerHomeCoachPath}
        onNavigate={navigate}
      />

      {/* ── KPI Strip ────────────────────────────────────── */}
      <KpiStrip aria-label="Today's key metrics">
        {kpiData.map(({ value, label, Icon, color }, i) => (
          <KpiCard key={label} style={{ '--i': i } as React.CSSProperties}>
            <KpiValue>
              <Icon size={16} color={color} aria-hidden="true" />
              {value}
            </KpiValue>
            <KpiLabel>{label}</KpiLabel>
          </KpiCard>
        ))}
      </KpiStrip>

      {/* ── Today's Sessions ─────────────────────────────── */}
      <SessionsCard>
        <SessionsHeading>Today's Sessions</SessionsHeading>
        {loading ? (
          <EmptyState>Loading schedule...</EmptyState>
        ) : error ? (
          <EmptyState>{error}</EmptyState>
        ) : sessions.length === 0 ? (
          <EmptyState>
            No sessions scheduled today.
            <BookBtn
              onClick={() => navigate('/dashboard/trainer/schedule')}
              aria-label="Open schedule"
            >
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
              const canLog = Boolean(logRoute && s.status !== 'completed' && s.status !== 'cancelled');
              const canDictate = Boolean(coachRoute && s.status !== 'completed' && s.status !== 'cancelled');

              return (
                <SessionRow key={s.id}>
                  <div>
                    <SessionClient>{getClientName(s)}</SessionClient>
                    <SessionTime>
                      {startDate
                        ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'TBD'}
                    </SessionTime>
                  </div>
                  <SessionActions>
                    <StatusBadge $status={s.status}>{s.status ?? 'upcoming'}</StatusBadge>
                    {canDictate && (
                      <SessionLogButton
                        type="button"
                        onClick={() => {
                          if (coachRoute) navigate(coachRoute);
                        }}
                        aria-label={`Dictate workout with Swan Coach for ${getClientName(s)}`}
                      >
                        <Brain size={14} aria-hidden="true" />
                        Coach
                      </SessionLogButton>
                    )}
                    {canLog && (
                      <SessionLogButton
                        type="button"
                        onClick={() => {
                          if (logRoute) navigate(logRoute);
                        }}
                        aria-label={`Log workout for ${getClientName(s)}`}
                      >
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
                <SessionsOverflowNote>
                  Showing {visibleSessions.length} of {sessions.length} sessions
                </SessionsOverflowNote>
                <BookBtn
                  type="button"
                  onClick={() => navigate('/dashboard/trainer/schedule')}
                  aria-label={`View all ${sessions.length} sessions`}
                >
                  <Calendar size={15} aria-hidden="true" />
                  View all {sessions.length} sessions
                </BookBtn>
              </SessionsOverflow>
            )}
          </>
        )}
      </SessionsCard>

      {/* ── Quick Actions ────────────────────────────────── */}
      <SectionHeading>Quick Actions</SectionHeading>
      <QuickGrid>
        {TRAINER_HOME_QUICK_ACTIONS.map(({ label, detail, overline, primary, Icon, path, tone, i }) => {
          const actionPath = (label === 'Ask Coach' || label === 'Log Workout') ? trainerHomeCoachPath : path;

          return (
            <ActionCard
              key={label}
              $tone={tone}
              $primary={primary}
              style={{ '--i': i } as React.CSSProperties}
              onClick={() => navigate(actionPath)}
              aria-label={primary ? `Primary trainer action: ${label}` : label}
            >
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
    </PageWrap>
  );
};

export default TrainerHomeTab;
