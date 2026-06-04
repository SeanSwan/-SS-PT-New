/**
 * One-tap daily actions for Client Hub grid cards.
 */

import React from 'react';
import styled from 'styled-components';
import { ClipboardList, Dumbbell, MessageCircle, TrendingUp } from 'lucide-react';

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
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 10px 22px var(--shadow-accent, rgba(96, 192, 240, 0.14));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 430px) {
    span {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const ClientHubGridCardActions: React.FC<ClientHubGridCardActionsProps> = ({
  clientName,
  onAction,
}) => (
  <ActionRow aria-label={`${clientName} quick actions`}>
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
