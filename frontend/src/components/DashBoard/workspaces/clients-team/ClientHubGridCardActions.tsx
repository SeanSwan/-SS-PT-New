/**
 * One-tap daily actions for Client Hub grid cards.
 */

import React from 'react';
import styled from 'styled-components';
import {
  ClipboardList,
  Dumbbell,
  MessageCircle,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { swanClientActionButton } from './clientCardSystem';

export type ClientHubQuickAction = 'log' | 'plan' | 'progress' | 'coach' | 'schedule' | 'message';

export interface ClientHubQuickActionConfig {
  action: ClientHubQuickAction;
  label: string;
  Icon: LucideIcon;
  aria: (name: string) => string;
}

interface ClientHubGridCardActionsProps {
  clientName: string;
  actions?: readonly ClientHubQuickActionConfig[];
  onAction: (action: ClientHubQuickAction) => void;
}

export const DEFAULT_CLIENT_HUB_QUICK_ACTIONS = [
  { action: 'log', label: 'Log', Icon: Dumbbell, aria: (name: string) => `Log ${name} workout` },
  { action: 'plan', label: 'Plan', Icon: ClipboardList, aria: (name: string) => `Plan ${name} workout` },
  { action: 'progress', label: 'Charts', Icon: TrendingUp, aria: (name: string) => `View ${name} progress` },
  { action: 'coach', label: 'Coach', Icon: MessageCircle, aria: (name: string) => `Open Swan Coach for ${name}` },
] as const;

const ActionRow = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(44px, 1fr));
  gap: 7px;
  min-width: 0;
`;

const QuickButton = styled.button`
  ${swanClientActionButton}
  display: inline-flex;
  padding: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;

  @media (max-width: 430px) {
    span {
      display: none;
    }
  }
`;

const ClientHubGridCardActions: React.FC<ClientHubGridCardActionsProps> = ({
  clientName,
  actions = DEFAULT_CLIENT_HUB_QUICK_ACTIONS,
  onAction,
}) => (
  <ActionRow role="group" aria-label={`${clientName} quick actions`} data-swan-card-section="admin-actions">
    {actions.map(({ action, label, Icon, aria }) => {
      const actionLabel = aria(clientName);
      return (
        <QuickButton key={action} type="button" onClick={() => onAction(action)} aria-label={actionLabel} title={actionLabel}>
          <Icon size={15} aria-hidden="true" />
          <span>{label}</span>
        </QuickButton>
      );
    })}
  </ActionRow>
);

export default ClientHubGridCardActions;
