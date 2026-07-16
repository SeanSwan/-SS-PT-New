/**
 * ============================================================================
 * FILE: ClientHubGridCard.tsx
 * PURPOSE: At-a-glance client command card for the admin Client Hub grid.
 * OWNER: Codex (card system) + Fable (readiness upgrade 2026-07-02)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows the trainer-critical facts before a client is
 * opened: login/account readiness, session inventory, next session, workout
 * proof, experience, source, and goal — with one-tap daily actions.
 *
 * HOW IT FITS IN THE APP: ClientsWorkspace -> roster grid (via
 * ClientHubGridSection); TrainerDashboard MyClientsView reuses this card.
 * Label/readiness logic lives in clientCardReadiness.ts (300-line cap).
 */

import { forwardRef } from 'react';
import { Activity, ClipboardCheck, Dumbbell, Trophy, UserRound } from 'lucide-react';
import { getClientOnboardingPct } from '../ClientsWorkspace.logic';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientSessionSignal } from './clientSessionSignal';
import { getClientSourceLabel, getClientSourceTone } from './clientSourceDisplay';
import { getClientDisplayName, getClientInitials } from './clientIdentity';
import {
  getAccountAccessReadiness,
  getNextSessionReadiness,
  hasCapturedClientName,
  lastLoggedLabelFor,
  onboardingLabelFor,
  onboardingNoteFor,
  onboardingReadinessFor,
  onboardingToneFor,
  relativeClientDateLabelFor,
  sessionBankReadinessFor,
  trimmedOrFallback,
  workoutCountFor,
  workoutProofLabelFor,
} from './clientCardReadiness';
import ClientHubGridCardActions, {
  type ClientHubQuickAction,
  type ClientHubQuickActionConfig,
} from './ClientHubGridCardActions';
import {
  Avatar,
  AvatarImage,
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
}) => {
  const accountAccess = getAccountAccessReadiness(client);
  const nextSession = getNextSessionReadiness(client);
  return (
    <ReadinessGrid
      role="group"
      data-swan-card-section="admin-readiness"
      aria-label={`${getClientDisplayName(client)} readiness`}
    >
      <ReadinessItem>
        <ReadinessLabel>Account</ReadinessLabel>
        <ReadinessValue $tone={accountAccess.tone}>{accountAccess.value}</ReadinessValue>
      </ReadinessItem>
      <ReadinessItem>
        <ReadinessLabel>Intake</ReadinessLabel>
        <ReadinessValue>{onboardingReadinessFor(onboardingPct)}</ReadinessValue>
      </ReadinessItem>
      <ReadinessItem>
        <ReadinessLabel>Next session</ReadinessLabel>
        <ReadinessValue $tone={nextSession.tone}>{nextSession.value}</ReadinessValue>
      </ReadinessItem>
      <ReadinessItem>
        <ReadinessLabel>Session bank</ReadinessLabel>
        <ReadinessValue>{sessionBankReadinessFor(sessionSignal)}</ReadinessValue>
      </ReadinessItem>
    </ReadinessGrid>
  );
};

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
  const photo = client.photo?.trim();
  return (
    <CardShell ref={ref} className="lens2-row" data-swan-client-card="admin">
      <CardButton
        type="button"
        onClick={() => onSelect(client)}
        aria-label={`Open ${fullName}`}
        data-swan-card-section="admin-identity"
      >
        <IdentityRow>
          <Avatar $source={sourceTone}>
            {photo ? <AvatarImage src={photo} alt="" /> : getClientInitials(client)}
          </Avatar>
          <CardBody>
            <TopLine>
              <Name>{fullName}</Name>
              {client.isActive === false && <Pill $tone="danger">deactivated</Pill>}
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
