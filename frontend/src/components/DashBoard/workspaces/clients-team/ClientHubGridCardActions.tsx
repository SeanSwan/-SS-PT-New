/**
 * One-tap daily actions for Client Hub grid cards.
 */

import React from 'react';
import styled from 'styled-components';
import { ClipboardList, Dumbbell, MessageCircle, TrendingUp } from 'lucide-react';
import { swanClientActionButton } from './clientCardSystem';

export type ClientHubQuickAction = 'log' | 'plan' | 'progress' | 'coach';

interface ClientHubGridCardActionsProps {
  clientName: string;
  onAction: (action: ClientHubQuickAction) => void;
}

const QUICK_ACTIONS = [
  { action: 'log', label: 'Log', Icon: Dumbbell, aria: (name: string) => `Log ${name} workout` },
  { action: 'plan', label: 'Plan', Icon: ClipboardList, aria: (name: string) => `Plan ${name} workout` },
  { action: 'progress', label: 'Charts', Icon: TrendingUp, aria: (name: string) => `View ${name} progress` },
  { action: 'coach', label: 'Coach', Icon: MessageCircle, aria: (name: string) => `Open Swan Coach for ${name}` },
] as const;

const ActionRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(44px, 1fr));
  gap: 7px;
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
  onAction,
}) => (
  <ActionRow aria-label={`${clientName} quick actions`} data-swan-card-section="admin-actions">
    {QUICK_ACTIONS.map(({ action, label, Icon, aria }) => {
      const actionLabel = aria(clientName);
      return (
        <QuickButton key={action} type="button" onClick={() => onAction(action)} aria-label={actionLabel} title={actionLabel}>
          <Icon size={15} />
          <span>{label}</span>
        </QuickButton>
      );
    })}
  </ActionRow>
);

export default ClientHubGridCardActions;
