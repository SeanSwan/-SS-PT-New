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

import React, { forwardRef } from 'react';
import { Activity, ClipboardCheck, Dumbbell, Target, Trophy, UserRound } from 'lucide-react';
import { getClientOnboardingPct } from '../ClientsWorkspace.logic';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientSessionSignal } from './clientSessionSignal';
import { getClientSourceLabel, getClientSourceTone } from './clientSourceDisplay';
import { getClientDisplayName, getClientInitials } from './clientIdentity';
import ClientHubGridCardActions, {
  type ClientHubQuickAction,
  type ClientHubQuickActionConfig,
} from './ClientHubGridCardActions';
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
  ProofHeader,
  ProofPanel,
  ProofValue,
  ReadinessGrid,
  ReadinessItem,
  ReadinessLabel,
  ReadinessValue,
  TopLine,
} from './ClientHubGridCard.styles';

interface ClientHubGridCardProps {
  client: ClientOption;
  onSelect: (client: ClientOption) => void;
  quickActions?: readonly ClientHubQuickActionConfig[];
  onQuickAction?: (client: ClientOption, action: ClientHubQuickAction) => void;
}

const sourceLabel = (client: ClientOption) => getClientSourceLabel(client.clientSource);

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

const onboardingReadinessFor = (onboardingPct: number | undefined) => {
  if (onboardingPct === undefined) return 'pending';
  if (onboardingPct >= 100) return 'complete';
  return 'in progress';
};

const onboardingToneFor = (onboardingPct: number | undefined) =>
  onboardingPct !== undefined && onboardingPct < 100 ? 'warning' : 'default';

const activeLabelFor = (client: ClientOption) => (client.isActive === false ? 'inactive' : 'active');

const workoutCountFor = (client: ClientOption) => {
  const parsed = Number(client.workoutCount ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const workoutProofLabelFor = (client: ClientOption) => (
  workoutCountFor(client) > 0 ? `${workoutCountFor(client)} logged` : 'No logs yet'
);

const lastLoggedLabelFor = (client: ClientOption) => {
  if (!client.lastSessionDate || workoutCountFor(client) <= 0) return null;
  const timestamp = Date.parse(client.lastSessionDate);
  if (!Number.isFinite(timestamp)) return null;
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
  return `Last logged: ${formatted}`;
};

const relativeClientDateLabelFor = (client: ClientOption) => {
  const value = client.assignedAt || client.joinDate;
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  const prefix = client.assignedAt ? 'Assigned' : 'Joined';
  if (days === 0) return `${prefix} Today`;
  if (days === 1) return `${prefix} Yesterday`;
  if (days < 14) return `${prefix} ${days} days ago`;
  if (days < 60) return `${prefix} ${Math.max(2, Math.round(days / 7))} weeks ago`;
  return `${prefix} ${Math.max(2, Math.round(days / 30))} months ago`;
};

const sessionBankReadinessFor = (sessionSignal: ReturnType<typeof getClientSessionSignal>) => {
  if (sessionSignal.tone === 'gold') return 'tracking mode';
  if (sessionSignal.tone === 'warning') return 'low inventory';
  return 'paid inventory';
};

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
      <Dumbbell size={14} aria-hidden="true" />
      {workoutCountFor(client)} workouts
    </Metric>
    <Metric $tone={sessionSignal.tone}>
      <Activity size={14} aria-hidden="true" />
      <MetricStack>
        <span>{sessionSignal.label}</span>
        <MetricNote>{sessionSignal.note}</MetricNote>
      </MetricStack>
    </Metric>
    <Metric>
      <Target size={14} aria-hidden="true" />
      {activeLabelFor(client)}
    </Metric>
    <Metric $tone={onboardingToneFor(onboardingPct)}>
      <ClipboardCheck size={14} aria-hidden="true" />
      <MetricStack>
        <span>{onboardingLabelFor(onboardingPct)}</span>
        <MetricNote>{onboardingNoteFor(onboardingPct)}</MetricNote>
      </MetricStack>
    </Metric>
  </MetricGrid>
);

const ClientReadinessStrip = ({
  client,
  sessionSignal,
  onboardingPct,
}: {
  client: ClientOption;
  sessionSignal: ReturnType<typeof getClientSessionSignal>;
  onboardingPct: number | undefined;
}) => (
  <ReadinessGrid
    role="group"
    data-swan-card-section="admin-readiness"
    aria-label={`${getClientDisplayName(client)} readiness`}
  >
    <ReadinessItem>
      <ReadinessLabel>Source</ReadinessLabel>
      <ReadinessValue>{sourceLabel(client)} source</ReadinessValue>
    </ReadinessItem>
    <ReadinessItem>
      <ReadinessLabel>Intake</ReadinessLabel>
      <ReadinessValue>{onboardingReadinessFor(onboardingPct)}</ReadinessValue>
    </ReadinessItem>
    <ReadinessItem>
      <ReadinessLabel>Next session</ReadinessLabel>
      <ReadinessValue>check schedule</ReadinessValue>
    </ReadinessItem>
    <ReadinessItem>
      <ReadinessLabel>Session bank</ReadinessLabel>
      <ReadinessValue>{sessionBankReadinessFor(sessionSignal)}</ReadinessValue>
    </ReadinessItem>
  </ReadinessGrid>
);

const ClientWorkoutProofPanel = ({ client }: { client: ClientOption }) => (
  <ProofPanel
    role="group"
    data-swan-card-section="admin-proof"
    aria-label={`${getClientDisplayName(client)} workout proof`}
  >
    <ProofHeader>
      <Trophy size={13} aria-hidden="true" />
      <span>Workout Proof</span>
    </ProofHeader>
    <ProofValue>
      <span>{workoutProofLabelFor(client)}</span>
      <small>{workoutCountFor(client) > 0 ? 'chart-ready activity' : 'log first session'}</small>
      {lastLoggedLabelFor(client) && <small>{lastLoggedLabelFor(client)}</small>}
    </ProofValue>
  </ProofPanel>
);

const QuickActionPanel = ({
  client,
  clientName,
  quickActions,
  onQuickAction,
}: {
  client: ClientOption;
  clientName: string;
  quickActions?: readonly ClientHubQuickActionConfig[];
  onQuickAction?: (client: ClientOption, action: ClientHubQuickAction) => void;
}) => {
  if (!onQuickAction) return null;
  return (
    <ClientHubGridCardActions
      clientName={clientName}
      actions={quickActions}
      onAction={(action) => onQuickAction(client, action)}
    />
  );
};

const ClientHubGridCard = forwardRef<HTMLElement, ClientHubGridCardProps>(function ClientHubGridCard(
  { client, onSelect, quickActions, onQuickAction },
  ref
) {
  const fullName = getClientDisplayName(client);
  const hasCapturedName = hasCapturedClientName(client);
  const experience = trimmedOrFallback(client.trainingExperience, 'experience pending');
  const goal = trimmedOrFallback(client.fitnessGoal, 'Goal not captured');
  const sessionSignal = getClientSessionSignal(client);
  const sourceTone = getClientSourceTone(client.clientSource);
  const onboardingPct = getClientOnboardingPct(client);
  const relativeClientDate = relativeClientDateLabelFor(client);
  return (
    <CardShell ref={ref} data-swan-client-card="admin">
      <CardButton
        type="button"
        onClick={() => onSelect(client)}
        aria-label={`Open ${fullName}`}
        data-swan-card-section="admin-identity"
      >
        <IdentityRow>
          <Avatar $source={sourceTone}>{getClientInitials(client)}</Avatar>
          <CardBody>
            <TopLine>
              <Name>{fullName}</Name>
              <Pill>
                <UserRound size={12} aria-hidden="true" />
                {sourceLabel(client)}
              </Pill>
              <Pill>{experience}</Pill>
              {relativeClientDate && <Pill>{relativeClientDate}</Pill>}
            </TopLine>
            <ContactIdentityLine client={client} show={hasCapturedName} />
          </CardBody>
        </IdentityRow>
      </CardButton>
      <GoalLine data-swan-card-section="admin-goal" aria-label={`Goal: ${goal}`} title={goal}>
        {goal}
      </GoalLine>
      <ClientReadinessStrip client={client} sessionSignal={sessionSignal} onboardingPct={onboardingPct} />
      <ClientCardMetrics client={client} sessionSignal={sessionSignal} onboardingPct={onboardingPct} />
      <ClientWorkoutProofPanel client={client} />
      <QuickActionPanel
        client={client}
        clientName={fullName}
        quickActions={quickActions}
        onQuickAction={onQuickAction}
      />
    </CardShell>
  );
});

export default ClientHubGridCard;
