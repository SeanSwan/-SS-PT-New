/**
 * MyClientsView.clientCard.tsx
 * ----------------------------
 * Trainer adapter around the canonical admin Clients & Team grid card.
 *
 * The trainer surface keeps its assigned-client data boundary and trainer
 * routes, but the visible card chrome/action vocabulary stays identical to
 * the admin Client Hub card.
 */

import { forwardRef, useCallback } from 'react';
import { CalendarClock, MessageSquare } from 'lucide-react';

import ClientHubGridCard from '../../DashBoard/workspaces/clients-team/ClientHubGridCard';
import {
  DEFAULT_CLIENT_HUB_QUICK_ACTIONS,
  type ClientHubQuickAction,
  type ClientHubQuickActionConfig,
} from '../../DashBoard/workspaces/clients-team/ClientHubGridCardActions';
import type { ClientOption } from '../../DashBoard/workspaces/clients-team/ClientSelectorDropdown';
import { getClientDisplayName } from '../../DashBoard/workspaces/clients-team/clientIdentity';
import { parseTrainerClientManagementId } from './MyClientsView.logic';
import type { ClientAssignment } from './MyClientsView.types';

interface TrainerClientCardProps {
  assignment: ClientAssignment;
  onOpenClient: (clientId: string) => void;
  onLogWorkout: (clientId: string) => void;
  onPlanWorkout: (clientId: string) => void;
  onScheduleSession: (clientId: string) => void;
  onMessageClient: (clientId: string) => void;
  onViewProgress: (clientId: string) => void;
  onOpenCopilot: (clientId: string, clientName: string) => void;
}

const TRAINER_CLIENT_QUICK_ACTIONS: readonly ClientHubQuickActionConfig[] = [
  ...DEFAULT_CLIENT_HUB_QUICK_ACTIONS,
  {
    action: 'schedule',
    label: 'Schedule',
    Icon: CalendarClock,
    aria: (name) => `Schedule ${name} session`,
  },
  {
    action: 'message',
    label: 'Message',
    Icon: MessageSquare,
    aria: (name) => `Message ${name}`,
  },
];

const numberOrFallback = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const toClientOption = (assignment: ClientAssignment): ClientOption => {
  const client = assignment.client;
  const parsedId = parseTrainerClientManagementId(client.id);
  const id = parsedId ?? 0;

  return {
    id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    clientSource: client.clientSource ?? 'swanstudios',
    isActive: assignment.isActive && client.status !== 'inactive',
    availableSessions: numberOrFallback(client.availableSessions),
    workoutCount: numberOrFallback(client.totalSessionsCompleted),
    lastSessionDate: client.lastSessionDate ?? null,
    // Pass through as-is: on the trainer surface an absent value means
    // "unknown here", not "none booked" — the card renders neutral guidance.
    nextSessionDate: client.nextSessionDate,
    assignedAt: assignment.assignedAt ?? null,
    joinDate: client.joinDate ?? null,
    fitnessGoal: client.fitnessGoal ?? '',
    trainingExperience: client.trainingExperience ?? '',
    photo: client.photo,
    onboardingComplete: client.onboardingComplete,
    isOnboardingComplete: client.onboardingComplete,
    onboardingPct: client.onboardingPct ?? null,
    onboardingCompletionPercentage: client.onboardingCompletionPercentage ?? null,
    completionPercentage: client.onboardingCompletionPercentage ?? client.onboardingPct ?? null,
  };
};

export const TrainerClientCard = forwardRef<HTMLElement, TrainerClientCardProps>(function TrainerClientCard(
  props,
  ref
) {
  const {
    assignment,
    onOpenClient,
    onLogWorkout,
    onPlanWorkout,
    onScheduleSession,
    onMessageClient,
    onViewProgress,
    onOpenCopilot,
  } = props;
  const cardClient = toClientOption(assignment);
  const actionClientId = assignment.client.id;
  const actionClientName = getClientDisplayName(cardClient);

  const handleSelect = useCallback((_client: ClientOption) => {
    onOpenClient(actionClientId);
  }, [actionClientId, onOpenClient]);

  const handleQuickAction = useCallback((_client: ClientOption, action: ClientHubQuickAction) => {
    const clientId = actionClientId;
    if (action === 'log') {
      onLogWorkout(clientId);
      return;
    }

    if (action === 'plan') {
      onPlanWorkout(clientId);
      return;
    }

    if (action === 'schedule') {
      onScheduleSession(clientId);
      return;
    }

    if (action === 'message') {
      onMessageClient(clientId);
      return;
    }

    if (action === 'progress') {
      onViewProgress(clientId);
      return;
    }

    onOpenCopilot(clientId, actionClientName);
  }, [
    actionClientId,
    actionClientName,
    onLogWorkout,
    onMessageClient,
    onOpenCopilot,
    onPlanWorkout,
    onScheduleSession,
    onViewProgress,
  ]);

  return (
    <ClientHubGridCard
      ref={ref}
      client={cardClient}
      onSelect={handleSelect}
      quickActions={TRAINER_CLIENT_QUICK_ACTIONS}
      onQuickAction={handleQuickAction}
    />
  );
});
