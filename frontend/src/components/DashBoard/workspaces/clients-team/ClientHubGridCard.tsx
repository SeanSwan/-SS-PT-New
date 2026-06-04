/**
 * ============================================================================
 * FILE: ClientHubGridCard.tsx
 * PURPOSE: At-a-glance client card for the admin Client Hub grid.
 * OWNER: Codex | LAST MODIFIED: 2026-05-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows the trainer-critical facts before a client is
 * opened: session inventory, workout count, experience, source, and goal.
 *
 * HOW IT FITS IN THE APP: ClientsWorkspace -> unselected client grid.
 */

import React from 'react';
import styled from 'styled-components';
import { Activity, ClipboardCheck, Dumbbell, Target, UserRound } from 'lucide-react';
import { getClientOnboardingPct } from '../ClientsWorkspace.logic';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientSessionSignal, type ClientSessionSignalTone } from './clientSessionSignal';
import { getClientSourceLabel } from './clientSourceDisplay';
import { getClientDisplayName, getClientInitials } from './clientIdentity';
import ClientHubGridCardActions, { type ClientHubQuickAction } from './ClientHubGridCardActions';

interface ClientHubGridCardProps {
  client: ClientOption;
  onSelect: (client: ClientOption) => void;
  onQuickAction?: (client: ClientOption, action: ClientHubQuickAction) => void;
}

const CardShell = styled.article`
  position: relative;
  display: grid;
  gap: 14px;
  min-height: 168px;
  padding: 16px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background:
    radial-gradient(circle at top left,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent),
      transparent 38%),
    linear-gradient(145deg,
      color-mix(in srgb, var(--bg-surface, #1A1A24) 92%, var(--accent-primary, #60C0F0) 8%),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, var(--accent-secondary, #8B5CF6) 12%));
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  box-shadow: 0 16px 34px var(--shadow-ambient, rgba(0, 0, 0, 0.32));
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(110deg, transparent 0%, var(--sheen-highlight, rgba(255, 255, 255, 0.08)) 44%, transparent 58%);
    transform: translateX(-120%);
    transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:hover {
    transform: translateY(-2px);
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 20px 44px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  }

  &:hover::after {
    transform: translateX(120%);
  }

  @media (max-width: 430px) {
    min-height: 156px;
    padding: 14px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }

    &::after {
      transition: none;
    }
  }
`;

const CardButton = styled.button`
  position: relative;
  z-index: 1;
  width: 100%;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
    border-radius: 12px;
  }

  @media (max-width: 430px) {
    grid-template-columns: 48px minmax(0, 1fr);
  }
`;

const Avatar = styled.div<{ $source?: string }>`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--button-text, #FFFFFF);
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 800;
  background: ${({ $source }) =>
    $source === 'move_fitness'
      ? 'linear-gradient(135deg, var(--rarity-rare, #C6A84B), var(--accent-secondary, #8B5CF6))'
      : $source === 'external'
        ? 'linear-gradient(135deg, var(--bg-elevated, #141419), var(--tertiary, #4070C0))'
      : 'linear-gradient(135deg, var(--primary, #002060), var(--accent-primary, #60C0F0))'};
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);

  @media (max-width: 430px) {
    width: 48px;
    height: 48px;
  }
`;

const CardBody = styled.div`
  min-width: 0;
`;

const TopLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
  flex-wrap: wrap;
`;

const Name = styled.div`
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.18;
`;

const Pill = styled.span`
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 80%, transparent);
  color: var(--text-muted, rgba(224, 236, 244, 0.84));
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
`;

const GoalLine = styled.div`
  display: -webkit-box;
  min-height: 36px;
  margin-bottom: 12px;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--text-muted, rgba(224, 236, 244, 0.82));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.35;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const Metric = styled.span<{ $tone?: ClientSessionSignalTone }>`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border-radius: 10px;
  border: 1px solid ${({ $tone = 'default' }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent)';
    if ($tone === 'warning') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)';
  }};
  background: ${({ $tone = 'default' }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--bg-elevated, #141419) 82%, var(--accent-gold, #C6A84B) 8%)';
    if ($tone === 'warning') return 'color-mix(in srgb, var(--bg-elevated, #141419) 82%, var(--accent-secondary, #8B5CF6) 10%)';
    return 'color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent)';
  }};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;

const MetricStack = styled.span`
  min-width: 0;
  display: grid;
  gap: 2px;
`;

const MetricNote = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
`;

const sourceLabel = (client: ClientOption) =>
  getClientSourceLabel(client.clientSource);

const ClientHubGridCard: React.FC<ClientHubGridCardProps> = ({ client, onSelect, onQuickAction }) => {
  const fullName = getClientDisplayName(client);
  const experience = client.trainingExperience?.trim() || 'experience pending';
  const goal = client.fitnessGoal?.trim() || 'Goal not captured';
  const sessionSignal = getClientSessionSignal(client);
  const onboardingPct = getClientOnboardingPct(client);
  const onboardingLabel = onboardingPct === undefined ? 'intake pending' : `${onboardingPct}% onboarded`;
  const onboardingNote = onboardingPct === undefined
    ? 'needs intake'
    : onboardingPct >= 100 ? 'intake complete' : 'intake progress';

  return (
    <CardShell>
      <CardButton type="button" onClick={() => onSelect(client)} aria-label={`Open ${fullName}`}>
        <Avatar $source={client.clientSource}>{getClientInitials(client)}</Avatar>
        <CardBody>
          <TopLine>
            <Name>{fullName}</Name>
            <Pill>
              <UserRound size={12} />
              {sourceLabel(client)}
            </Pill>
            <Pill>{experience}</Pill>
          </TopLine>
          <GoalLine>{goal}</GoalLine>
          <MetricGrid>
            <Metric>
              <Dumbbell size={14} />
              {client.workoutCount || 0} workouts
            </Metric>
            <Metric $tone={sessionSignal.tone}>
              <Activity size={14} />
              <MetricStack>
                <span>{sessionSignal.label}</span>
                <MetricNote>{sessionSignal.note}</MetricNote>
              </MetricStack>
            </Metric>
            <Metric>
              <Target size={14} />
              {client.isActive === false ? 'inactive' : 'active'}
            </Metric>
            <Metric $tone={onboardingPct !== undefined && onboardingPct < 100 ? 'warning' : 'default'}>
              <ClipboardCheck size={14} />
              <MetricStack>
                <span>{onboardingLabel}</span>
                <MetricNote>{onboardingNote}</MetricNote>
              </MetricStack>
            </Metric>
          </MetricGrid>
        </CardBody>
      </CardButton>
      {onQuickAction && (
        <ClientHubGridCardActions
          clientName={fullName}
          onAction={(action) => onQuickAction(client, action)}
        />
      )}
    </CardShell>
  );
};

export default ClientHubGridCard;
