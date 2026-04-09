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
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, Clock, CheckCircle, Dumbbell, Calendar, Zap, Eye } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import { useTrainerTodaySessions, getClientName } from '../../../../hooks/useTrainerTodaySessions';
import SwanCoachDockTrainer from './SwanCoachDockTrainer';

// ─── Animations ──────────────────────────────────────────────────────────────

const countUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

const PageWrap = styled.div`
  padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1rem;
  max-width: 860px;
  @media (max-width: 414px) { padding: 1rem; gap: 0.875rem; }
  @media (max-width: 375px) { padding: 0.875rem; }
`;

// ── KPI Strip ─────────────────────────────────────────────────────

const KpiStrip = styled.div.attrs(() => ({ role: 'group' }))`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  @media (min-width: 600px) { grid-template-columns: repeat(4, 1fr); }
`;

const KpiCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 14px;
  padding: 1rem;
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 60ms);
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const KpiValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.375rem; font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  display: flex; align-items: center; gap: 0.375rem;
  margin-bottom: 0.25rem;
`;

const KpiLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

// ── Today's Sessions ──────────────────────────────────────────────

const SessionsCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 16px;
  padding: 1.125rem 1.375rem;
`;

const SessionsHeading = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem; font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.875rem;
`;

const SessionRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.625rem 0;
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
  &:last-child { border-bottom: none; }
`;

const SessionClient = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem; font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  display: block;
`;

const SessionTime = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

const StatusBadge = styled.span<{ $status?: string }>`
  font-size: 0.7rem; font-weight: 600;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  white-space: nowrap;
  background: ${({ $status }) =>
    $status === 'completed' ? 'color-mix(in srgb, var(--success, #22c55e) 12%, transparent)' :
    $status === 'cancelled' ? 'rgba(201, 42, 84, 0.12)' :   /* Crimson Frost alpha */
    'rgba(96, 192, 240, 0.12)'}; /* Ice Wing alpha */
  color: ${({ $status }) =>
    $status === 'completed' ? 'var(--success, #22c55e)' :
    $status === 'cancelled' ? 'var(--danger, #C92A54)' :
    'var(--accent-primary, #60C0F0)'};
`;

const EmptyState = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  padding: 1.5rem; text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-size: 0.875rem; font-family: 'Sora', sans-serif;
`;

const BookBtn = styled.button`
  display: inline-flex; align-items: center; gap: 0.4rem;
  min-height: 44px; padding: 0.625rem 1.125rem;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  background: rgba(96, 192, 240, 0.07);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif; font-size: 0.8125rem; font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  &:hover {
    background: rgba(96, 192, 240, 0.13);
    border-color: rgba(96, 192, 240, 0.45);
    box-shadow: 0 0 14px rgba(96, 192, 240, 0.15);
  }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

// ── Quick Actions ─────────────────────────────────────────────────

const SectionHeading = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin: 0;
`;

const QuickGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;

const ActionCard = styled.button<{ $rgb: string }>`
  all: unset; box-sizing: border-box; cursor: pointer;
  display: flex; align-items: center; gap: 0.875rem;
  min-height: 64px; padding: 1rem 1.125rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(${({ $rgb }) => $rgb}, 0.1);
  border-radius: 14px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 50ms);

  &:hover {
    border-color: rgba(${({ $rgb }) => $rgb}, 0.3);
    background: rgba(${({ $rgb }) => $rgb}, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(${({ $rgb }) => $rgb}, 0.12);
  }
  &:focus-visible { outline: 2px solid rgba(${({ $rgb }) => $rgb}, 0.7); outline-offset: 2px; }
  &:active { transform: translateY(0); }
  @media (prefers-reduced-motion: reduce) { animation: none; &:hover { transform: none; } }
`;

const ActionIcon = styled.span<{ $rgb: string }>`
  width: 40px; height: 40px; min-width: 40px;
  border-radius: 10px;
  background: rgba(${({ $rgb }) => $rgb}, 0.1);
  border: 1px solid rgba(${({ $rgb }) => $rgb}, 0.15);
  display: flex; align-items: center; justify-content: center;
  color: rgba(${({ $rgb }) => $rgb}, 1);
`;

const ActionLabel = styled.span`
  font-family: 'Sora', sans-serif; font-size: 0.875rem; font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

// ─── Constants ───────────────────────────────────────────────────────────────

const KPI_COLORS = [
  'var(--accent-primary, #60C0F0)',
  'var(--accent-secondary, #8B5CF6)',
  'var(--accent-gold, #C6A84B)',
  'var(--success, #22c55e)',
] as const;

const QUICK_ACTIONS = [
  { label: 'Log Workout',   Icon: Dumbbell, path: '/dashboard/trainer/log-workout',  rgb: '96, 192, 240',  i: 0 },
  { label: 'View Clients',  Icon: Eye,      path: '/dashboard/trainer/clients',       rgb: '139, 92, 246',  i: 1 },
  { label: 'My Schedule',   Icon: Calendar, path: '/dashboard/trainer/schedule',      rgb: '198, 168, 75',  i: 2 },
  { label: 'Workout Forge', Icon: Zap,      path: '/dashboard/trainer/workout-forge', rgb: '64, 112, 192',  i: 3 },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

const TrainerHomeTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useGamificationData();
  const { sessions, loading, error, stats } = useTrainerTodaySessions();

  const trainerName = user?.firstName ?? user?.username ?? 'Trainer';
  const level = profile.data?.level ?? 1;

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
          sessions.slice(0, 5).map(s => (
            <SessionRow key={s.id}>
              <div>
                <SessionClient>{getClientName(s)}</SessionClient>
                <SessionTime>
                  {s.startTime
                    ? new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'TBD'}
                </SessionTime>
              </div>
              <StatusBadge $status={s.status}>{s.status ?? 'upcoming'}</StatusBadge>
            </SessionRow>
          ))
        )}
      </SessionsCard>

      {/* ── Quick Actions ────────────────────────────────── */}
      <SectionHeading>Quick Actions</SectionHeading>
      <QuickGrid>
        {QUICK_ACTIONS.map(({ label, Icon, path, rgb, i }) => (
          <ActionCard
            key={path}
            $rgb={rgb}
            style={{ '--i': i } as React.CSSProperties}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            <ActionIcon $rgb={rgb} aria-hidden="true"><Icon size={18} /></ActionIcon>
            <ActionLabel>{label}</ActionLabel>
          </ActionCard>
        ))}
      </QuickGrid>
    </PageWrap>
  );
};

export default TrainerHomeTab;
