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
import { getClientSourceLabel, getClientSourceTone } from './clientSourceDisplay';
import { getClientDisplayName, getClientInitials } from './clientIdentity';
import ClientHubGridCardActions, { type ClientHubQuickAction } from './ClientHubGridCardActions';
import {
  Avatar,
  CardBody,
  CardButton,
  CardShell,
  ContactLine,
  GoalLine,
  IdentityRow,
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

const trimmedOrFallback = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed || fallback;
};

const hasCapturedClientName = (client: ClientOption) =>
  Boolean(client.firstName?.trim() || client.lastName?.trim());

const onboardingLabelFor = (onboardingPct: number | undefined) => {
  if (onboardingPct === undefined) return 'intake pending';
  return `${onboardingPct}% onboarded`;
};

const onboardingNoteFor = (onboardingPct: number | undefined) => {
  if (onboardingPct === undefined) return 'needs intake';
  if (onboardingPct >= 100) return 'intake complete';
  return 'intake progress';
};

const onboardingToneFor = (onboardingPct: number | undefined) => (
  onboardingPct !== undefined && onboardingPct < 100 ? 'warning' : 'default'
);

const activeLabelFor = (client: ClientOption) => (client.isActive === false ? 'inactive' : 'active');

const ContactIdentityLine = ({
  client,
  show,
}: {
  client: ClientOption;
  show: boolean;
}) => {
  if (!show || !client.email) return null;
  return <ContactLine>{client.email}</ContactLine>;
};

const ClientCardMetrics = ({
  client,
  sessionSignal,
  onboardingPct,
}: {
  client: ClientOption;
  sessionSignal: ReturnType<typeof getClientSessionSignal>;
  onboardingPct: number | undefined;
}) => (
  <MetricGrid data-swan-card-section="admin-metrics">
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
      {activeLabelFor(client)}
    </Metric>
    <Metric $tone={onboardingToneFor(onboardingPct)}>
      <ClipboardCheck size={14} />
      <MetricStack>
        <span>{onboardingLabelFor(onboardingPct)}</span>
        <MetricNote>{onboardingNoteFor(onboardingPct)}</MetricNote>
      </MetricStack>
    </Metric>
  </MetricGrid>
);

const QuickActionPanel = ({
  client,
  clientName,
  onQuickAction,
}: {
  client: ClientOption;
  clientName: string;
  onQuickAction?: (client: ClientOption, action: ClientHubQuickAction) => void;
}) => {
  if (!onQuickAction) return null;
  return (
    <ClientHubGridCardActions
      clientName={clientName}
      onAction={(action) => onQuickAction(client, action)}
    />
  );
};

const ClientHubGridCard: React.FC<ClientHubGridCardProps> = ({ client, onSelect, onQuickAction }) => {
  const fullName = getClientDisplayName(client);
  const hasCapturedName = hasCapturedClientName(client);
  const experience = trimmedOrFallback(client.trainingExperience, 'experience pending');
  const goal = trimmedOrFallback(client.fitnessGoal, 'Goal not captured');
  const sessionSignal = getClientSessionSignal(client);
  const sourceTone = getClientSourceTone(client.clientSource);
  const onboardingPct = getClientOnboardingPct(client);
  const handleOpenKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(client);
  };

  return (
    <CardShell data-swan-client-card="admin">
      <CardButton
        role="button"
        tabIndex={0}
        onClick={() => onSelect(client)}
        onKeyDown={handleOpenKeyDown}
        aria-label={`Open ${fullName}`}
        data-swan-card-section="admin-identity"
      >
        <IdentityRow>
          <Avatar $source={sourceTone}>{getClientInitials(client)}</Avatar>
          <CardBody>
            <TopLine>
              <Name>{fullName}</Name>
              <Pill>
                <UserRound size={12} />
                {sourceLabel(client)}
              </Pill>
              <Pill>{experience}</Pill>
            </TopLine>
            <ContactIdentityLine client={client} show={hasCapturedName} />
          </CardBody>
        </IdentityRow>
      </CardButton>
      <GoalLine data-swan-card-section="admin-goal">{goal}</GoalLine>
      <ClientCardMetrics client={client} sessionSignal={sessionSignal} onboardingPct={onboardingPct} />
      <QuickActionPanel client={client} clientName={fullName} onQuickAction={onQuickAction} />
    </CardShell>
  );
};

export default ClientHubGridCard;
