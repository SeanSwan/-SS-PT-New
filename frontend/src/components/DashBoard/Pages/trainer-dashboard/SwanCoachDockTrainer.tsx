/**
 * Blueprint: SwanCoachDockTrainer
 * Purpose: always-available Swan Coach dock for the trainer Home surface.
 * States: loading skeleton, ready greeting, action chips, and AICommandBar.
 * Privacy: trainerName renders locally only and is never sent to an API.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Brain, ClipboardCheck, Users, Calendar } from 'lucide-react';
import { AICommandBar } from '../../../Shared/AICommandBar';
import { sanitizeImageUrl } from '../../../../utils/imageUrl';
import { TRAINER_HOME_COACH_PATH } from './TrainerHomeQuickActions.config';

// Animations

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
  accentGlowCyan: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)',
  avatarBorder: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)',
  avatarGlow: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)',
  skeletonBorder: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent)',
  skeletonLow: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 4%, transparent)'
};

const shimmerAnim = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled components

const DockWrap = styled.div`
  background: ${SWAN_COACH_DOCK_THEME.surface};
  border: 1px solid ${SWAN_COACH_DOCK_THEME.accentBorder};
  border-radius: 20px;
  padding: 1.25rem 1.5rem;
  /* Static, confident dual-glow (Wing Purple border + Ice Wing glow) replaces the
     5s box-shadow pulse, which read like a loading/error state and pulled focus. */
  box-shadow: 0 0 20px ${SWAN_COACH_DOCK_THEME.accentGlowCyan};

  @media (max-width: 414px) { padding: 1rem 1.125rem; border-radius: 16px; }
  @media (max-width: 375px) { padding: 0.875rem 1rem; }
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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 520px) {
    align-items: start;
  }
`;

const CoachAvatar = styled.div`
  width: 82px;
  height: 82px;
  min-width: 82px;
  border-radius: 22px;
  background: linear-gradient(135deg,
    var(--brand-primary, #002060),
    var(--accent-secondary, #8B5CF6));
  border: 1px solid ${SWAN_COACH_DOCK_THEME.avatarBorder};
  display: flex; align-items: center; justify-content: center;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.18rem;
  font-weight: 900;
  overflow: hidden;
  box-shadow: 0 0 12px ${SWAN_COACH_DOCK_THEME.avatarGlow};

  @media (max-width: 520px) {
    width: 68px;
    height: 68px;
    min-width: 68px;
    border-radius: 18px;
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
`;

const CoachText = styled.div`
  flex: 1;
  overflow: hidden;
`;

const CoachGreeting = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.18rem;
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.25rem;
  overflow-wrap: break-word;

  @media (max-width: 520px) {
    font-size: 1rem;
  }
`;

const CoachHandle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 0.35rem;
`;

const CoachMeta = styled.p`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
  margin: 0;
  letter-spacing: 0;
`;

const ChipRow = styled.div`
  display: flex; gap: 0.625rem; flex-wrap: wrap;
  margin-bottom: 1rem;
  align-items: stretch;

  > button {
    flex: 1 1 10rem;
  }

  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 375px) { gap: 0.5rem; }
`;

const Chip = styled.button`
  display: inline-flex; align-items: center; gap: 0.375rem;
  min-height: 44px;
  justify-content: center;
  padding: 0.5rem 0.875rem;
  border-radius: 10px;
  border: 1px solid ${SWAN_COACH_DOCK_THEME.accentBorder};
  background: ${SWAN_COACH_DOCK_THEME.accentFillLow};
  color: ${SWAN_COACH_DOCK_THEME.accent};
  font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);

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
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

const CommandDivider = styled.div`
  border-top: 1px solid ${SWAN_COACH_DOCK_THEME.accentPulseLow};
  margin-bottom: 0.75rem;
`;

// Helpers

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const t = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${t}, ${name}.`;
}

function getInitials(name: string, handle?: string): string {
  const fallback = handle?.replace(/^@/, '') || 'Trainer';
  const source = name.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || fallback[0] || 'T';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return `${first}${last || ''}`.toUpperCase();
}

const CHIPS = [
  { label: 'Log Workout',  path: '/dashboard/trainer/clients?intent=log_workout', Icon: ClipboardCheck },
  { label: 'Ask Coach',    path: TRAINER_HOME_COACH_PATH,                          Icon: Brain          },
  { label: 'View Clients', path: '/dashboard/trainer/clients',     Icon: Users          },
  { label: 'My Schedule',  path: '/dashboard/trainer/schedule',    Icon: Calendar       },
] as const;

// Component

interface SwanCoachDockTrainerProps {
  /** Trainer display name rendered locally only, never sent to any API. */
  trainerName: string;
  sessionCount: number;
  level: number;
  trainerHandle?: string;
  trainerPhotoUrl?: string | null;
  coachPath?: string;
  loading?: boolean;
  onNavigate: (path: string) => void;
}

const SwanCoachDockTrainer: React.FC<SwanCoachDockTrainerProps> = ({
  trainerName,
  sessionCount,
  level,
  trainerHandle,
  trainerPhotoUrl,
  coachPath = TRAINER_HOME_COACH_PATH,
  loading = false,
  onNavigate,
}) => {
  if (loading) return <DockSkeleton aria-hidden="true" />;

  const sessLabel = sessionCount === 1 ? '1 session today' : `${sessionCount} sessions today`;
  const safePhoto = sanitizeImageUrl(trainerPhotoUrl);
  const profileInitials = getInitials(trainerName, trainerHandle);

  return (
    <DockWrap role="region" aria-label="Swan Coach">
      <CoachRow>
        <CoachAvatar>
          {safePhoto ? (
            <img src={safePhoto} alt={`${trainerName} profile`} />
          ) : (
            <span aria-hidden="true">{profileInitials}</span>
          )}
        </CoachAvatar>
        <CoachText>
          <CoachGreeting>{getGreeting(trainerName)}</CoachGreeting>
          {trainerHandle && <CoachHandle>{trainerHandle}</CoachHandle>}
          <CoachMeta>{sessLabel} - Lv.{level}</CoachMeta>
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
