/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SwanCoachDockTrainer                             ║
 * ║  PURPOSE: Always-available Swan Coach dock for trainer Home  ║
 * ║  OWNER: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-09        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * GATE MODEL: No consent gate — trainers always have Swan Coach access.
 *   Trainer Ops Mode is always-on per Swan Coach V1 Spec.
 *
 * STATES:
 *   loading → shimmer skeleton
 *   ready   → greeting + 3 action chips + AICommandBar (collapsed)
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────┐
 * │ [Brain]  "Good morning, Sean."           │
 * │          3 sessions today  ·  Lv.12      │
 * │ [Log Workout] [View Clients] [Schedule]  │
 * │ ─────────────────────────────────────── │
 * │ [✦] Ask Swan Coach...       (Ctrl+K)    │
 * └──────────────────────────────────────────┘
 *
 * PRIVACY: trainerName rendered locally only — never sent to any API.
 * Sprint A: embeds AICommandBar as the lightweight shell; no second
 *   command router. Shared logic stays centralized.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Brain, ClipboardCheck, Users, Calendar } from 'lucide-react';
import { AICommandBar } from '../../../Shared/AICommandBar';
import { TRAINER_HOME_COACH_PATH } from './TrainerHomeQuickActions.config';

// ─── Animations ──────────────────────────────────────────────────────────────

const SWAN_COACH_DOCK_THEME = {
  surface: 'var(--bg-elevated, #141419)',
  accent: 'var(--accent-secondary, #8B5CF6)',
  accentPulseLow: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)',
  accentPulseHigh: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)',
  accentBorderSoft: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)',
  accentBorder: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)',
  accentBorderStrong: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)',
  accentFillLow: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, transparent)',
  accentFill: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)',
  accentGlow: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)',
  avatarBorder: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)',
  avatarGlow: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)',
  skeletonBorder: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent)',
  skeletonLow: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 4%, transparent)'
};

const coachPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px ${SWAN_COACH_DOCK_THEME.accentPulseLow}; }
  50%       { box-shadow: 0 0 30px ${SWAN_COACH_DOCK_THEME.accentPulseHigh}; }
`;

const shimmerAnim = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

const DockWrap = styled.div`
  background: ${SWAN_COACH_DOCK_THEME.surface};
  border: 1px solid ${SWAN_COACH_DOCK_THEME.accentBorderSoft};
  border-radius: 20px;
  padding: 1.25rem 1.5rem;
  animation: ${coachPulse} 5s ease-in-out infinite;

  @media (max-width: 414px) { padding: 1rem 1.125rem; border-radius: 16px; }
  @media (max-width: 375px) { padding: 0.875rem 1rem; }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const DockSkeleton = styled.div`
  min-height: 215px;
  border: 1px solid ${SWAN_COACH_DOCK_THEME.skeletonBorder};
  border-radius: 20px;
  background: linear-gradient(90deg,
    ${SWAN_COACH_DOCK_THEME.skeletonLow} 0%,
    ${SWAN_COACH_DOCK_THEME.accentPulseLow} 50%,
    ${SWAN_COACH_DOCK_THEME.skeletonLow} 100%);
  background-size: 200% 100%;
  animation: ${shimmerAnim} 1.8s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.5; }
`;

const CoachRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const CoachAvatar = styled.div`
  width: 44px; height: 44px; min-width: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg,
    var(--brand-primary, #002060),
    var(--accent-secondary, #8B5CF6));
  border: 1px solid ${SWAN_COACH_DOCK_THEME.avatarBorder};
  display: flex; align-items: center; justify-content: center;
  color: ${SWAN_COACH_DOCK_THEME.accent};
  box-shadow: 0 0 12px ${SWAN_COACH_DOCK_THEME.avatarGlow};
`;

const CoachText = styled.div`
  flex: 1;
  overflow: hidden;
`;

const CoachGreeting = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem; font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.25rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const CoachMeta = styled.p`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  margin: 0;
  letter-spacing: 0.04em;
`;

const ChipRow = styled.div`
  display: flex; gap: 0.625rem; flex-wrap: wrap;
  margin-bottom: 1rem;
  @media (max-width: 375px) { gap: 0.5rem; }
`;

const Chip = styled.button`
  display: inline-flex; align-items: center; gap: 0.375rem;
  min-height: 44px;
  padding: 0.5rem 0.875rem;
  border-radius: 10px;
  border: 1px solid ${SWAN_COACH_DOCK_THEME.accentBorder};
  background: ${SWAN_COACH_DOCK_THEME.accentFillLow};
  color: ${SWAN_COACH_DOCK_THEME.accent};
  font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: ${SWAN_COACH_DOCK_THEME.accentFill};
    border-color: ${SWAN_COACH_DOCK_THEME.accentBorderStrong};
    box-shadow: 0 0 12px ${SWAN_COACH_DOCK_THEME.accentGlow};
  }
  &:focus-visible {
    outline: 2px solid ${SWAN_COACH_DOCK_THEME.accent};
    outline-offset: 2px;
  }
  @media (max-width: 375px) { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
`;

const CommandDivider = styled.div`
  border-top: 1px solid ${SWAN_COACH_DOCK_THEME.accentPulseLow};
  margin-bottom: 0.75rem;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const t = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${t}, ${name}.`;
}

const CHIPS = [
  { label: 'Log Workout',  path: '/dashboard/trainer/clients?intent=log_workout', Icon: ClipboardCheck },
  { label: 'Ask Coach',    path: TRAINER_HOME_COACH_PATH,                          Icon: Brain          },
  { label: 'View Clients', path: '/dashboard/trainer/clients',     Icon: Users          },
  { label: 'My Schedule',  path: '/dashboard/trainer/schedule',    Icon: Calendar       },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface SwanCoachDockTrainerProps {
  /** Trainer display name — rendered locally only, never sent to any API */
  trainerName: string;
  sessionCount: number;
  level: number;
  coachPath?: string;
  loading?: boolean;
  onNavigate: (path: string) => void;
}

const SwanCoachDockTrainer: React.FC<SwanCoachDockTrainerProps> = ({
  trainerName, sessionCount, level, coachPath = TRAINER_HOME_COACH_PATH, loading = false, onNavigate,
}) => {
  if (loading) return <DockSkeleton aria-hidden="true" />;

  const sessLabel = sessionCount === 1 ? '1 session today' : `${sessionCount} sessions today`;

  return (
    <DockWrap role="region" aria-label="Swan Coach">
      <CoachRow>
        <CoachAvatar aria-hidden="true"><Brain size={20} /></CoachAvatar>
        <CoachText>
          <CoachGreeting>{getGreeting(trainerName)}</CoachGreeting>
          <CoachMeta>{sessLabel} &nbsp;·&nbsp; Lv.{level}</CoachMeta>
        </CoachText>
      </CoachRow>

      <ChipRow>
        {CHIPS.map(({ label, path, Icon }) => (
          <Chip
            key={path}
            type="button"
            onClick={() => onNavigate(label === 'Ask Coach' ? coachPath : path)}
            aria-label={label}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </Chip>
        ))}
      </ChipRow>

      <CommandDivider />
      <AICommandBar context="workout_generation" />
    </DockWrap>
  );
};

export default SwanCoachDockTrainer;
