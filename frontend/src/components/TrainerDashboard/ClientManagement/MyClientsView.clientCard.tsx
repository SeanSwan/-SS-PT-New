/**
 * MyClientsView.clientCard.tsx
 * ----------------------------
 * Repeated trainer-client card renderer for the canonical trainer /clients route.
 */

import {
  Award,
  BarChart3,
  Calendar,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Edit,
  Layers,
  Mail,
  MessageSquare,
  PhoneCall,
  Sparkles,
  Target,
} from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';

import { getClientSessionSignal } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import {
  ActionButton,
  ClientActions,
  ClientAvatar,
  ClientCard,
  ClientDetails,
  ClientHeader,
  ClientInfo,
  ClientMetrics,
  ClientName,
  ClientNameButton,
  MetricItem,
  NeedsPlanDot,
  NeedsPlanWrapper,
} from './MyClientsView.cardStyles';
import type { ClientAssignment } from './MyClientsView.types';
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

const PhoneDetail = ({ phone }: { phone?: string | null }) => {
  if (!phone) return null;
  return (
    <div>
      <PhoneCall size={14} aria-hidden="true" />
      <span>{phone}</span>
    </div>
  );
};

const NeedsPlanIndicator = ({ show }: { show: boolean }) => (show ? <NeedsPlanDot /> : null);

export const TrainerClientCard = forwardRef<HTMLDivElement, TrainerClientCardProps>(function TrainerClientCard({
  assignment,
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

  return (
    <ClientCard
      ref={ref}
      $membershipColor={membershipColor}
      role="article"
      aria-label={`${clientName} trainer client summary`}
      data-swan-client-card="trainer"
      data-card-index={index}
    >
      <ClientHeader data-swan-card-section="trainer-identity">
        <ClientAvatar $status={client.status}>
          {getInitials(client.firstName, client.lastName)}
        </ClientAvatar>
        <ClientInfo>
          <ClientName>
            <ClientNameButton
              type="button"
              aria-label={`Open ${clientName} client workspace`}
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
        aria-label={`${clientName} client readiness`}
        data-swan-card-section="trainer-readiness"
      >
        <ReadinessChip>
          <Layers size={15} aria-hidden="true" />
          <span>{sourceLabel}</span>
        </ReadinessChip>
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
          <Calendar size={16} className="metric-icon" />
          <div className="metric-value">{sessionSignal.label}</div>
          <div className="metric-label">{sessionSignal.note}</div>
        </MetricItem>
        <MetricItem>
          <CheckCircle size={16} className="metric-icon" />
          <div className="metric-value">{client.totalSessionsCompleted}</div>
          <div className="metric-label">Completed</div>
        </MetricItem>
        <MetricItem>
          <Target size={16} className="metric-icon" />
          <div className="metric-value">{client.goals.current}</div>
          <div className="metric-label">Active Goals</div>
        </MetricItem>
        <MetricItem>
          <Award size={16} className="metric-icon" />
          <div className="metric-value">{client.goals.completed}</div>
          <div className="metric-label">Achieved</div>
        </MetricItem>
      </ClientMetrics>

      <WorkoutProofPanel>
        <ProofHeader>
          <ProofLabel>Workout Proof</ProofLabel>
          <ProofValue>{proofValue}</ProofValue>
        </ProofHeader>
        <ProofSubtext>{proofSubtext}</ProofSubtext>
      </WorkoutProofPanel>

      <ClientActions className="client-actions" data-swan-card-section="trainer-actions">
        <ActionIconButton
          title="Log Workout"
          variant="primary"
          onClick={() => onLogWorkout(client.id)}
          icon={<Edit size={16} />}
        />
        <ActionIconButton
          title="Schedule Session"
          variant="success"
          onClick={() => onScheduleSession(client.id)}
          icon={<Calendar size={16} />}
        />
        <ActionIconButton
          title="Message Client"
          variant="secondary"
          onClick={() => onMessageClient(client.id)}
          icon={<MessageSquare size={16} />}
        />
        <ActionIconButton
          title="View Progress"
          variant="warning"
          onClick={() => onViewProgress(client.id)}
          icon={<BarChart3 size={16} />}
        />
        <NeedsPlanWrapper>
          <ActionIconButton
            title={copilotTitle}
            variant="primary"
            onClick={() => onOpenCopilot(client.id, clientName)}
            icon={<Sparkles size={16} />}
          />
          <NeedsPlanIndicator show={needsFirstPlan} />
        </NeedsPlanWrapper>
      </ClientActions>
    </ClientCard>
  );
});

interface ActionIconButtonProps {
  title: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning';
  onClick: () => void;
  icon: ReactNode;
}

const ActionIconButton = ({
  title,
  variant,
  onClick,
  icon,
}: ActionIconButtonProps) => (
  <ActionButton
    $variant={variant}
    type="button"
    aria-label={title}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    title={title}
  >
    {icon}
  </ActionButton>
);
