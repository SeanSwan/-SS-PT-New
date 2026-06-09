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
import { Users, CalendarDays, Clock, CheckCircle, Dumbbell, Calendar, BarChart3, Brain, Eye } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import {
  buildTrainerSessionCoachRoute,
  buildTrainerSessionLogRoute,
  getClientName,
  getSessionStartDate,
  useTrainerTodaySessions,
} from '../../../../hooks/useTrainerTodaySessions';
import SwanCoachDockTrainer from './SwanCoachDockTrainer';
import {
  ActionCard,
  ActionIcon,
  ActionLabel,
  BookBtn,
  EmptyState,
  KpiCard,
  KpiLabel,
  KpiStrip,
  KpiValue,
  PageWrap,
  QuickGrid,
  SectionHeading,
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

export const TRAINER_HOME_QUICK_ACTIONS = [
  { label: 'Log Workout',     Icon: Dumbbell,  path: '/dashboard/trainer/clients?intent=log_workout', tone: 'var(--accent-primary, #60C0F0)',   i: 0 },
  { label: 'View Clients',    Icon: Eye,       path: '/dashboard/trainer/clients',         tone: 'var(--accent-secondary, #8B5CF6)', i: 1 },
  { label: 'Client Progress', Icon: BarChart3, path: '/dashboard/trainer/client-progress', tone: 'var(--accent-gold, #C6A84B)',      i: 2 },
  { label: 'Swan Coach',      Icon: Brain,     path: '/dashboard/trainer/coach-assistant', tone: 'var(--swan-lavender, #4070C0)',    i: 3 },
] as const;

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
        {TRAINER_HOME_QUICK_ACTIONS.map(({ label, Icon, path, tone, i }) => (
          <ActionCard
            key={path}
            $tone={tone}
            style={{ '--i': i } as React.CSSProperties}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            <ActionIcon $tone={tone} aria-hidden="true"><Icon size={18} /></ActionIcon>
            <ActionLabel>{label}</ActionLabel>
          </ActionCard>
        ))}
      </QuickGrid>
    </PageWrap>
  );
};

export default TrainerHomeTab;
