/**
 * MyClientsView.clientCard.tsx
 * ----------------------------
 * Repeated trainer-client card renderer for the canonical trainer /clients route.
 */

import {
  Award,
  Calendar,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Dumbbell,
  Layers,
  Mail,
  PhoneCall,
  Target,
} from 'lucide-react';
import { forwardRef } from 'react';

import { getClientSessionSignal } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import { TrainerClientActionRail } from './MyClientsView.clientCardActions';
import {
  ClientAvatar,
  ClientCard,
  ClientDetails,
  ClientHeader,
  ClientInfo,
  ClientMetrics,
  ClientName,
  ClientNameButton,
  MetricItem,
} from './MyClientsView.cardStyles';
import type { ClientAssignment, TrainerClientIntent } from './MyClientsView.types';
import {
  formatTimeAgo,
  getClientSourceLabel,
  getInitials,
  getMembershipBadgeStyle,
  getMembershipColor,
  getNextSessionLabel,
  getOnboardingReadinessLabel,
} from './MyClientsView.logic';
import {
  ClientReadinessStrip,
  ProofHeader,
  ProofLabel,
  ProofSubtext,
  ProofValue,
  ReadinessChip,
  WorkoutProofPanel,
} from './MyClientsView.readinessStyles';

interface TrainerClientCardProps {
  assignment: ClientAssignment;
  intent: TrainerClientIntent;
  index: number;
  onOpenClient: (clientId: string) => void;
  onLogWorkout: (clientId: string) => void;
  onScheduleSession: (clientId: string) => void;
  onMessageClient: (clientId: string) => void;
  onViewProgress: (clientId: string) => void;
  onOpenCopilot: (clientId: string, clientName: string) => void;
}

const timelineLabelFor = (joinedAgo: string | null, assignedAgo: string | null) => {
  if (joinedAgo) return `Joined ${joinedAgo}`;
  if (assignedAgo) return `Assigned ${assignedAgo}`;
  return 'Start date unavailable';
};

const hasWorkoutProofFor = (client: ClientAssignment['client']) => (
  client.totalSessionsCompleted > 0 || Boolean(client.lastSessionDate)
);

const proofValueFor = (client: ClientAssignment['client']) => (
  hasWorkoutProofFor(client) ? `${client.totalSessionsCompleted} logged` : 'No logs yet'
);

const proofSubtextFor = (lastLoggedAgo: string | null) => (
  lastLoggedAgo ? `Last logged: ${lastLoggedAgo}` : 'Log a workout to unlock trend proof'
);

const copilotTitleFor = (client: ClientAssignment['client']) => (
  client.totalSessionsCompleted === 0 ? 'Generate first AI workout plan' : 'Workout Intelligence'
);

const statusReadinessLabelFor = (status: string) => `${status.charAt(0).toUpperCase()}${status.slice(1)} client`;

const compactClientFact = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed || null;
};

const PhoneDetail = ({ phone }: { phone?: string | null }) => {
  if (!phone) return null;
  return (
    <div>
      <PhoneCall size={14} aria-hidden="true" />
      <span>{phone}</span>
    </div>
  );
};

export const TrainerClientCard = forwardRef<HTMLDivElement, TrainerClientCardProps>(function TrainerClientCard({
  assignment,
  intent,
  index,
  onOpenClient,
  onLogWorkout,
  onScheduleSession,
  onMessageClient,
  onViewProgress,
  onOpenCopilot,
}, ref) {
  const { client } = assignment;
  const membershipColor = getMembershipColor(client.membershipLevel);
  const joinedAgo = formatTimeAgo(client.joinDate);
  const assignedAgo = formatTimeAgo(assignment.assignedAt);
  const timelineLabel = timelineLabelFor(joinedAgo, assignedAgo);
  const lastLoggedAgo = formatTimeAgo(client.lastSessionDate);
  const proofValue = proofValueFor(client);
  const proofSubtext = proofSubtextFor(lastLoggedAgo);
  const sessionSignal = getClientSessionSignal(client);
  const clientName = `${client.firstName} ${client.lastName}`;
  const sourceLabel = getClientSourceLabel(client.clientSource);
  const nextSessionLabel = getNextSessionLabel(client.nextSessionDate);
  const onboardingLabel = getOnboardingReadinessLabel(client);
  const statusReadinessLabel = statusReadinessLabelFor(client.status);
  const copilotTitle = copilotTitleFor(client);
  const needsFirstPlan = client.totalSessionsCompleted === 0;
  const fitnessGoal = compactClientFact(client.fitnessGoal);
  const trainingExperience = compactClientFact(client.trainingExperience);
  const openClientActionLabel = intent === 'log_workout'
    ? `Log workout for ${clientName}`
    : `Open ${clientName} client workspace`;

  return (
    <ClientCard
      ref={ref}
      $membershipColor={membershipColor}
      role="article"
      aria-label={`${clientName} trainer client summary`}
      data-swan-client-card="trainer"
      data-card-index={index}
      data-testid={`trainer-client-card-${client.id}`}
    >
      <ClientHeader data-swan-card-section="trainer-identity">
        <ClientAvatar $status={client.status}>
          {getInitials(client.firstName, client.lastName)}
        </ClientAvatar>
        <ClientInfo>
          <ClientName>
            <ClientNameButton
              type="button"
              aria-label={openClientActionLabel}
              onClick={() => onOpenClient(client.id)}
            >
              {clientName}
            </ClientNameButton>
            <span
              className="membership-badge"
              style={getMembershipBadgeStyle(client.membershipLevel)}
            >
              {client.membershipLevel}
            </span>
          </ClientName>
          <ClientDetails data-swan-card-section="trainer-contact">
            <div
              data-swan-trainer-email-row
              aria-label={client.email}
              title={client.email}
            >
              <Mail size={14} aria-hidden="true" />
              <span data-swan-trainer-email="true">{client.email}</span>
            </div>
            <PhoneDetail phone={client.phone} />
            <div>
              <Calendar size={14} aria-hidden="true" />
              <span>{timelineLabel}</span>
            </div>
          </ClientDetails>
        </ClientInfo>
      </ClientHeader>

      <ClientReadinessStrip
        role="group"
        aria-label={`${clientName} client readiness`}
        data-swan-card-section="trainer-readiness"
      >
        <ReadinessChip>
          <Layers size={15} aria-hidden="true" />
          <span>{sourceLabel}</span>
        </ReadinessChip>
        {trainingExperience && (
          <ReadinessChip>
            <Dumbbell size={15} aria-hidden="true" />
            <span>{trainingExperience}</span>
          </ReadinessChip>
        )}
        {fitnessGoal && (
          <ReadinessChip>
            <Target size={15} aria-hidden="true" />
            <span>{fitnessGoal}</span>
          </ReadinessChip>
        )}
        <ReadinessChip>
          <CalendarClock size={15} aria-hidden="true" />
          <span>{nextSessionLabel}</span>
        </ReadinessChip>
        <ReadinessChip>
          <ClipboardList size={15} aria-hidden="true" />
          <span>{onboardingLabel}</span>
        </ReadinessChip>
        <ReadinessChip>
          <CheckCircle size={15} aria-hidden="true" />
          <span>{statusReadinessLabel}</span>
        </ReadinessChip>
      </ClientReadinessStrip>

      <ClientMetrics data-swan-card-section="trainer-metrics">
        <MetricItem>
          <Calendar size={16} className="metric-icon" aria-hidden="true" />
          <div className="metric-value">{sessionSignal.label}</div>
          <div className="metric-label">{sessionSignal.note}</div>
        </MetricItem>
        <MetricItem>
          <CheckCircle size={16} className="metric-icon" aria-hidden="true" />
          <div className="metric-value">{client.totalSessionsCompleted}</div>
          <div className="metric-label">Completed</div>
        </MetricItem>
        <MetricItem>
          <Target size={16} className="metric-icon" aria-hidden="true" />
          <div className="metric-value">{client.goals.current}</div>
          <div className="metric-label">Active Goals</div>
        </MetricItem>
        <MetricItem>
          <Award size={16} className="metric-icon" aria-hidden="true" />
          <div className="metric-value">{client.goals.completed}</div>
          <div className="metric-label">Achieved</div>
        </MetricItem>
      </ClientMetrics>

      <WorkoutProofPanel
        role="group"
        aria-label={`${clientName} workout proof`}
      >
        <ProofHeader>
          <ProofLabel>Workout Proof</ProofLabel>
          <ProofValue>{proofValue}</ProofValue>
        </ProofHeader>
        <ProofSubtext>{proofSubtext}</ProofSubtext>
      </WorkoutProofPanel>

      <TrainerClientActionRail
        clientId={client.id}
        clientName={clientName}
        copilotTitle={copilotTitle}
        needsFirstPlan={needsFirstPlan}
        onLogWorkout={onLogWorkout}
        onScheduleSession={onScheduleSession}
        onMessageClient={onMessageClient}
        onViewProgress={onViewProgress}
        onOpenCopilot={onOpenCopilot}
      />
    </ClientCard>
  );
});
