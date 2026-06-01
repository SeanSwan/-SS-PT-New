/**
 * MyClientsView.clientCard.tsx
 * ----------------------------
 * Repeated trainer-client card renderer for the canonical trainer /clients route.
 */

import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle,
  Edit,
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
  getInitials,
  getMembershipBadgeStyle,
  getMembershipColor,
} from './MyClientsView.logic';

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

      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}>
          <span style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary, rgba(255, 255, 255, 0.7))',
          }}>
            Workout Proof
          </span>
          <span style={{
            fontSize: '0.85rem',
            color: 'var(--text-primary, #ffffff)',
            fontWeight: 600,
          }}>
            {hasWorkoutProof ? `${client.totalSessionsCompleted} logged` : 'No logs yet'}
          </span>
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-tertiary, rgba(255, 255, 255, 0.6))',
          textAlign: 'center',
          marginTop: '0.25rem',
        }}>
          {lastLoggedAgo && <>Last logged: {lastLoggedAgo}</>}
          {!lastLoggedAgo && <>Log a workout to unlock trend proof</>}
        </div>
      </div>

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
