/**
 * ============================================================================
 * FILE: ClientMiniCard.tsx
 * PURPOSE: Compact client card for the master pane with 3 quick actions
 * AUTHOR: Claude Opus 4.6 + Gemini 3.1 Pro | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a compact client card in the left master pane
 * with avatar, name, engagement bar, and 3 quick-action icon buttons.
 * Clicking the card body selects the client and opens detail view.
 *
 * HOW IT FITS IN THE APP: ClientsWorkspace → MasterPane → ClientList → ClientMiniCard
 *
 * KEY DECISIONS: 3 quick actions (Message, Log Workout, View Workouts) with
 * contextual weigh-in swap when overdue >30 days. Dual-glow selection state.
 */

import React, { useCallback } from 'react';
import { MessageSquare, Dumbbell, Eye, Scale } from 'lucide-react';
import {
  ClientCardButton,
  ClientAvatar,
  ClientInfo,
  ClientName,
  ClientMeta,
  StatusDot,
  QuickActions,
  QuickActionBtn,
  EngagementTrack,
  EngagementFill,
} from './MasterDetailStyles';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface MiniCardClient {
  id: number | string;
  firstName: string;
  lastName: string;
  email?: string;
  status: 'active' | 'inactive' | 'pending';
  tier?: string;
  engagementScore?: number;
  lastWeighIn?: string | null;
  sessionsLeft?: number;
  workoutCount?: number;
}

interface ClientMiniCardProps {
  client: MiniCardClient;
  isSelected: boolean;
  index: number;
  onSelect: (clientId: number | string) => void;
  onMessage: (clientId: number | string) => void;
  onLogWorkout: (clientId: number | string) => void;
  onViewWorkouts: (clientId: number | string) => void;
  onWeighIn: (clientId: number | string) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

const getInitials = (first: string, last: string): string => {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
};

const isWeighInOverdue = (lastWeighIn: string | null | undefined): boolean => {
  if (!lastWeighIn) return true;
  const last = new Date(lastWeighIn);
  const now = new Date();
  const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 30;
};

const isCriticallyOverdue = (lastWeighIn: string | null | undefined): boolean => {
  if (!lastWeighIn) return true;
  const last = new Date(lastWeighIn);
  const now = new Date();
  const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 60;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientMiniCard: React.FC<ClientMiniCardProps> = React.memo(({
  client,
  isSelected,
  index,
  onSelect,
  onMessage,
  onLogWorkout,
  onViewWorkouts,
  onWeighIn,
}) => {
  const overdue = isWeighInOverdue(client.lastWeighIn);

  const handleCardClick = useCallback(() => {
    onSelect(client.id);
  }, [client.id, onSelect]);

  // Stop propagation so quick actions don't trigger card selection
  const handleQuickAction = useCallback((e: React.MouseEvent, action: (id: number | string) => void) => {
    e.stopPropagation();
    action(client.id);
  }, [client.id]);

  return (
    <StyledBox as={ClientCardButton}
      $isSelected={isSelected}
      onClick={handleCardClick}
      $style={{ '--stagger-idx': index } as React.CSSProperties}
      aria-label={`Select ${client.firstName} ${client.lastName}`}
      aria-pressed={isSelected}
    >
      <ClientAvatar $tier={client.tier}>
        {getInitials(client.firstName, client.lastName)}
      </ClientAvatar>

      <ClientInfo>
        <ClientName>{client.firstName} {client.lastName}</ClientName>
        <ClientMeta>
          <StatusDot $status={client.status} />
          {client.sessionsLeft != null && `${client.sessionsLeft} sessions`}
          {client.workoutCount != null && ` · ${client.workoutCount} workouts`}
        </ClientMeta>
        <EngagementTrack>
          <EngagementFill $progress={client.engagementScore || 0} />
        </EngagementTrack>
      </ClientInfo>

      <QuickActions>
        <QuickActionBtn
          onClick={(e) => handleQuickAction(e, onMessage)}
          title="Message"
          aria-label={`Message ${client.firstName}`}
        >
          <MessageSquare size={14} />
        </QuickActionBtn>

        <QuickActionBtn
          onClick={(e) => handleQuickAction(e, onLogWorkout)}
          title="Log Workout"
          aria-label={`Log workout for ${client.firstName}`}
        >
          <Dumbbell size={14} />
        </QuickActionBtn>

        {/* Contextual 3rd action: View Workouts or Weigh-In if overdue */}
        {overdue ? (
          <QuickActionBtn
            onClick={(e) => handleQuickAction(e, onWeighIn)}
            title={`Weigh-in overdue${isCriticallyOverdue(client.lastWeighIn) ? ' (critical)' : ''}`}
            aria-label={`Record weigh-in for ${client.firstName} (overdue)`}
            $alert
          >
            <Scale size={14} />
          </QuickActionBtn>
        ) : (
          <QuickActionBtn
            onClick={(e) => handleQuickAction(e, onViewWorkouts)}
            title="View Workouts"
            aria-label={`View workouts for ${client.firstName}`}
          >
            <Eye size={14} />
          </QuickActionBtn>
        )}
      </QuickActions>
    </StyledBox>
  );
});

ClientMiniCard.displayName = 'ClientMiniCard';

export default ClientMiniCard;
