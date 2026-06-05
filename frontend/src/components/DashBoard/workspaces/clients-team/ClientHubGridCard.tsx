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
import { Activity, ClipboardCheck, Dumbbell, Target, UserRound } from 'lucide-react';
import { getClientOnboardingPct } from '../ClientsWorkspace.logic';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientSessionSignal } from './clientSessionSignal';
import { getClientSourceLabel } from './clientSourceDisplay';
import { getClientDisplayName, getClientInitials } from './clientIdentity';
import ClientHubGridCardActions, { type ClientHubQuickAction } from './ClientHubGridCardActions';
import {
  Avatar,
  CardBody,
  CardButton,
  CardShell,
  GoalLine,
  Metric,
  MetricGrid,
  MetricNote,
  MetricStack,
  Name,
  Pill,
  TopLine,
} from './ClientHubGridCard.styles';

interface ClientHubGridCardProps {
  client: ClientOption;
  onSelect: (client: ClientOption) => void;
  onQuickAction?: (client: ClientOption, action: ClientHubQuickAction) => void;
}

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
