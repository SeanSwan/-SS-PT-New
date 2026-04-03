/**
 * ┌─── SUB-COMPONENT: ClientHeaderCard ───────────────────────┐
 * │ PARENT: ClientsWorkspace (Client Hub)                      │
 * │ PURPOSE: Always-visible client info banner with key stats  │
 * │ Props: { client, onboardingPct }                           │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Activity, Target, Calendar, TrendingUp } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface ClientHeaderProps {
  client: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    clientSource?: string;
    isActive?: boolean;
    availableSessions?: number;
    workoutCount?: number;
    fitnessGoal?: string;
    trainingExperience?: string;
    dateOfBirth?: string;
    photo?: string;
  };
  onboardingPct?: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const onboardingGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
`;

const CardWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const AvatarLarge = styled.div<{ $source?: string }>`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${({ $source }) =>
    $source === 'move_fitness'
      ? 'linear-gradient(135deg, #C6A84B 0%, #8B5CF6 100%)'
      : 'linear-gradient(135deg, #002060 0%, #60C0F0 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

const InfoBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Badge = styled.span<{ $variant: 'mf' | 'ss' | 'status' }>`
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  ${({ $variant }) => {
    if ($variant === 'mf') return `background: rgba(198,168,75,0.15); color: #C6A84B;`;
    if ($variant === 'ss') return `background: rgba(96,192,240,0.12); color: #60C0F0;`;
    return `background: rgba(139,92,246,0.12); color: #8B5CF6;`;
  }}
`;

const MetaLine = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin-top: 4px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`;

const StatPill = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: ${({ $color }) => $color || 'var(--text-primary, #E0ECF4)'};
  white-space: nowrap;
`;

const OnboardingBar = styled.div<{ $pct: number; $incomplete: boolean }>`
  width: 100%;
  margin-top: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $incomplete }) =>
    $incomplete ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-soft, rgba(96, 192, 240, 0.08))'};
  ${({ $incomplete }) => $incomplete && `animation: ${onboardingGlow} 3s ease-in-out infinite;`}
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(96, 192, 240, 0.1);
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
  border-radius: 3px;
  background: ${({ $pct }) =>
    $pct >= 100
      ? 'linear-gradient(90deg, #60C0F0, #8B5CF6)'
      : 'var(--accent-secondary, #8B5CF6)'};
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ClientHeaderCard: React.FC<ClientHeaderProps> = ({ client, onboardingPct }) => {
  const initials = `${(client.firstName || '?')[0]}${(client.lastName || '?')[0]}`.toUpperCase();
  const isMF = client.clientSource === 'move_fitness';
  const age = client.dateOfBirth
    ? Math.floor((Date.now() - new Date(client.dateOfBirth).getTime()) / (365.25 * 86400000))
    : null;
  const showOnboarding = onboardingPct != null && onboardingPct < 100;

  return (
    <CardWrap>
      <AvatarLarge $source={client.clientSource}>{initials}</AvatarLarge>

      <InfoBlock>
        <ClientName>
          {client.firstName} {client.lastName}
          <Badge $variant={isMF ? 'mf' : 'ss'}>{isMF ? 'Move Fitness' : 'SwanStudios'}</Badge>
          {client.trainingExperience && (
            <Badge $variant="status">{client.trainingExperience}</Badge>
          )}
        </ClientName>
        <MetaLine>
          {age && <span>{age} years old</span>}
          {client.fitnessGoal && <span>{client.fitnessGoal}</span>}
        </MetaLine>
      </InfoBlock>

      <StatsRow>
        <StatPill $color="#60C0F0">
          <Activity size={14} />
          {client.workoutCount || 0} workouts
        </StatPill>
        {!isMF && (
          <StatPill $color={client.availableSessions ? '#C6A84B' : 'rgba(224,236,244,0.4)'}>
            <Target size={14} />
            {client.availableSessions || 0} sessions left
          </StatPill>
        )}
      </StatsRow>

      {showOnboarding && (
        <OnboardingBar $pct={onboardingPct!} $incomplete={onboardingPct! < 100}>
          <span>Onboarding: {onboardingPct}%</span>
          <ProgressTrack>
            <ProgressFill $pct={onboardingPct!} />
          </ProgressTrack>
          <span>{Math.round((onboardingPct! / 100) * 8)}/8 sections</span>
        </OnboardingBar>
      )}
    </CardWrap>
  );
};

export default memo(ClientHeaderCard);
