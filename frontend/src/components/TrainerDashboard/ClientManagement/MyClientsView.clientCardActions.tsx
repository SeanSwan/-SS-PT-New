/**
 * MyClientsView.clientCardActions.tsx
 * -----------------------------------
 * Low-click trainer command rail for each canonical trainer client card.
 */

import {
  BarChart3,
  Calendar,
  Dumbbell,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

import { ActionIconButton } from './MyClientsView.actionButton';
import {
  ClientActions,
  NeedsPlanDot,
  NeedsPlanWrapper,
} from './MyClientsView.cardStyles';

interface TrainerClientActionRailProps {
  clientId: string;
  clientName: string;
  copilotTitle: string;
  needsFirstPlan: boolean;
  onLogWorkout: (clientId: string) => void;
  onScheduleSession: (clientId: string) => void;
  onMessageClient: (clientId: string) => void;
  onViewProgress: (clientId: string) => void;
  onOpenCopilot: (clientId: string, clientName: string) => void;
}

export const TrainerClientActionRail = ({
  clientId,
  clientName,
  copilotTitle,
  needsFirstPlan,
  onLogWorkout,
  onScheduleSession,
  onMessageClient,
  onViewProgress,
  onOpenCopilot,
}: TrainerClientActionRailProps) => (
  <ClientActions
    role="group"
    aria-label={`${clientName} trainer commands`}
    className="client-actions"
    data-swan-card-section="trainer-actions"
  >
    <ActionIconButton
      label="Log Today"
      ariaLabel={`Log today for ${clientName}`}
      title="Open today's workout logger"
      variant="primary"
      onClick={() => onLogWorkout(clientId)}
      icon={<Dumbbell size={16} aria-hidden="true" />}
    />
    <NeedsPlanWrapper>
      <ActionIconButton
        label="Plan"
        ariaLabel={`Plan workout for ${clientName}`}
        title={copilotTitle}
        variant="success"
        onClick={() => onOpenCopilot(clientId, clientName)}
        icon={<Sparkles size={16} aria-hidden="true" />}
      />
      {needsFirstPlan && <NeedsPlanDot aria-hidden="true" />}
    </NeedsPlanWrapper>
    <ActionIconButton
      label="Progress"
      ariaLabel={`View progress for ${clientName}`}
      variant="warning"
      onClick={() => onViewProgress(clientId)}
      icon={<BarChart3 size={16} aria-hidden="true" />}
    />
    <ActionIconButton
      label="Schedule"
      ariaLabel={`Schedule session for ${clientName}`}
      variant="secondary"
      onClick={() => onScheduleSession(clientId)}
      icon={<Calendar size={16} aria-hidden="true" />}
    />
    <ActionIconButton
      label="Message"
      ariaLabel={`Message ${clientName}`}
      variant="secondary"
      onClick={() => onMessageClient(clientId)}
      icon={<MessageSquare size={16} aria-hidden="true" />}
    />
  </ClientActions>
);
