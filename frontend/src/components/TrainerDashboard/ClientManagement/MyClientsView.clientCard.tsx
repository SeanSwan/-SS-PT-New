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
  ClipboardCheck,
  ClipboardList,
  Edit,
  Layers,
  MessageSquare,
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
  const hasWorkoutProof = client.totalSessionsCompleted > 0 || Boolean(client.lastSessionDate);
  const joinedAgo = formatTimeAgo(client.joinDate);
  const assignedAgo = formatTimeAgo(assignment.assignedAt);
  const timelineLabel = joinedAgo
    ? `Joined ${joinedAgo}`
    : assignedAgo
      ? `Assigned ${assignedAgo}`
      : 'Start date unavailable';
  const lastLoggedAgo = formatTimeAgo(client.lastSessionDate);
  const sessionSignal = getClientSessionSignal(client);
  const clientName = `${client.firstName} ${client.lastName}`;
  const sourceLabel = getClientSourceLabel(client.clientSource);
  const nextSessionLabel = getNextSessionLabel(client.nextSessionDate);
  const onboardingLabel = getOnboardingReadinessLabel(client);

  return (
    <ClientCard
      ref={ref}
      $membershipColor={membershipColor}
      role="article"
      aria-label={`${clientName} trainer client summary`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <ClientHeader>
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
          <ClientDetails>
            <div>📧 {client.email}</div>
            {client.phone && <div>📞 {client.phone}</div>}
            <div>📅 {timelineLabel}</div>
          </ClientDetails>
        </ClientInfo>
      </ClientHeader>

      <ClientReadinessStrip aria-label={`${clientName} client readiness`}>
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
          <ClipboardCheck size={15} aria-hidden="true" />
          <span>{sessionSignal.label}</span>
        </ReadinessChip>
      </ClientReadinessStrip>

      <ClientMetrics>
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
          <ProofValue>
            {hasWorkoutProof ? `${client.totalSessionsCompleted} logged` : 'No logs yet'}
          </ProofValue>
        </ProofHeader>
        <ProofSubtext>
          {lastLoggedAgo && <>Last logged: {lastLoggedAgo}</>}
          {!lastLoggedAgo && <>Log a workout to unlock trend proof</>}
        </ProofSubtext>
      </WorkoutProofPanel>

      <ClientActions className="client-actions">
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
            title={client.totalSessionsCompleted === 0
              ? 'Generate first AI workout plan'
              : 'Workout Intelligence'}
            variant="primary"
            onClick={() => onOpenCopilot(client.id, clientName)}
            icon={<Sparkles size={16} />}
          />
          {client.totalSessionsCompleted === 0 && <NeedsPlanDot />}
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
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    title={title}
  >
    {icon}
  </ActionButton>
);
