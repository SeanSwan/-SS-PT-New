/**
 * ┌─── SUB-COMPONENT: ClientHeaderCard ───────────────────────┐
 * │ PARENT: ClientsWorkspace (Client Hub)                      │
 * │ PURPOSE: Always-visible client info banner with key stats  │
 * │ Props: { client, onboardingPct }                           │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { Activity, Target } from 'lucide-react';
import { getClientSessionSignal, type ClientSessionSignalTone } from './clientSessionSignal';
import { getClientSourceLabel, getClientSourceTone, type ClientSourceTone } from './clientSourceDisplay';
import { getClientDisplayName, getClientInitials } from './clientIdentity';
import { swanClientAvatar, swanDataCardShell, swanMetricTile, swanPill } from './clientCardSystem';

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

const getClientAge = (dateOfBirth?: string): number | null => {
  if (!dateOfBirth) return null;
  const birthTime = new Date(dateOfBirth).getTime();
  if (Number.isNaN(birthTime)) return null;

  const age = Math.floor((Date.now() - birthTime) / (365.25 * 86400000));
  return age >= 0 && age <= 120 ? age : null;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const CardWrap = styled.div`
  --swan-card-padding: 16px 20px;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    --swan-card-padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const AvatarLarge = styled.div<{ $source?: ClientSourceTone }>`
  --swan-avatar-size: 56px;
  ${swanClientAvatar}
  background: ${({ $source }) =>
    $source === 'mf'
      ? 'linear-gradient(135deg, var(--accent-gold, #C6A84B) 0%, var(--accent-secondary, #8B5CF6) 100%)'
      : 'linear-gradient(135deg, var(--primary, #002060) 0%, var(--accent-primary, #60C0F0) 100%)'};
  font-size: 20px;
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

const Badge = styled.span<{ $variant: 'mf' | 'ss' | 'external' | 'status' }>`
  ${swanPill}
  font-size: 11px;
  font-weight: 700;
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0;
  ${({ $variant }) => {
    if ($variant === 'mf') return `
      background: color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent);
      color: var(--accent-gold, #C6A84B);
    `;
    if ($variant === 'ss') return `
      background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
      color: var(--accent-primary, #60C0F0);
    `;
    if ($variant === 'external') return `
      background: color-mix(in srgb, var(--text-muted, rgba(224, 236, 244, 0.72)) 14%, transparent);
      color: var(--text-primary, #E0ECF4);
    `;
    return `
      background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
      color: var(--accent-secondary, #8B5CF6);
    `;
  }}
`;

const MetaLine = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.85));
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

const StatPill = styled.div<{ $tone?: ClientSessionSignalTone }>`
  ${swanPill}
  display: flex;
  align-items: center;
  padding: 6px 12px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: ${({ $tone = 'default' }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'warning') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--text-primary, #E0ECF4)';
  }};
  max-width: 100%;
`;

const StatStack = styled.span`
  display: grid;
  gap: 2px;
`;

const StatNote = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-size: 10px;
  font-weight: 700;
`;

const OnboardingBar = styled.div<{ $pct: number; $incomplete: boolean }>`
  ${swanMetricTile}
  width: 100%;
  margin-top: 8px;
  padding: 8px 14px;
  border: 1px solid ${({ $incomplete }) =>
    $incomplete
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'
      : 'var(--border-soft, rgba(96, 192, 240, 0.08))'};
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
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
  border-radius: 3px;
  background: ${({ $pct }) =>
    $pct >= 100
      ? 'linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))'
      : 'var(--accent-secondary, #8B5CF6)'};
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ClientHeaderCard: React.FC<ClientHeaderProps> = ({ client, onboardingPct }) => {
  const clientName = getClientDisplayName(client);
  const initials = getClientInitials(client);
  const sourceTone = getClientSourceTone(client.clientSource);
  const sourceLabel = getClientSourceLabel(client.clientSource);
  const sessionSignal = getClientSessionSignal(client);
  const age = getClientAge(client.dateOfBirth);
  const showOnboarding = onboardingPct != null && onboardingPct < 100;

  return (
    <CardWrap>
      <AvatarLarge $source={sourceTone}>{initials}</AvatarLarge>

      <InfoBlock>
        <ClientName>
          {clientName}
          <Badge $variant={sourceTone}>{sourceLabel}</Badge>
          {client.trainingExperience && (
            <Badge $variant="status">{client.trainingExperience}</Badge>
          )}
        </ClientName>
        <MetaLine>
          {age !== null && <span>{age} years old</span>}
          {client.fitnessGoal && <span>{client.fitnessGoal}</span>}
        </MetaLine>
      </InfoBlock>

      <StatsRow>
        <StatPill>
          <Activity size={14} />
          {client.workoutCount || 0} workouts
        </StatPill>
        <StatPill $tone={sessionSignal.tone}>
          <Target size={14} />
          <StatStack>
            <span>{sessionSignal.label}</span>
            <StatNote>{sessionSignal.note}</StatNote>
          </StatStack>
        </StatPill>
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
