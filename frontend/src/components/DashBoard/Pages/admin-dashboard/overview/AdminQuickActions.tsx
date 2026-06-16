import React from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import { motion } from 'framer-motion';
import { CommandCard } from '../AdminDashboardCards';
import { AdminQuickAction } from './AdminOverview.types';

interface AdminQuickActionsProps {
  actions: AdminQuickAction[];
}

const PRIMARY_ACTION_IDS = new Set([
  'coach-command',
  'coach-client-intake',
  'log-client-workout',
  'my-workout',
]);

const TODAY_FLOW_ACTION_ORDER = [
  'coach-command',
  'log-client-workout',
  'my-workout',
  'coach-client-intake',
];

const QuickActionsWrapper = styled(CommandCard)`
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const QuickActionsHeader = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 640px) {
    align-items: start;
    flex-direction: column;
  }
`;

const QuickActionsTitle = styled.h3`
  font-size: 1.2rem;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const QuickActionsKicker = styled.span`
  color: var(--accent-gold, #C6A84B);
  font: 800 0.72rem/1 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0;
`;

const TodayFlowList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 860px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const TodayFlowStep = styled.li<{ $hero?: boolean }>`
  min-width: 0;
  ${({ $hero }) => $hero ? 'grid-column: 1 / -1;' : ''}
`;

const SecondaryActionGroup = styled.div`
  display: grid;
  gap: 0.65rem;
`;

const ActionGroupLabel = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font: 800 0.72rem/1 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0;
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const QuickActionCard = styled(CommandCard)<{ $priority?: boolean; $hero?: boolean }>`
  appearance: none;
  width: 100%;
  padding: ${({ $hero, $priority }) => ($hero ? '1.35rem' : $priority ? '1.1rem' : '1rem')};
  min-height: ${({ $hero, $priority }) => ($hero ? '138px' : $priority ? '108px' : '98px')};
  display: flex;
  flex-direction: column;
  align-items: ${({ $priority }) => ($priority ? 'flex-start' : 'center')};
  justify-content: center;
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  cursor: pointer;
  text-align: ${({ $priority }) => ($priority ? 'left' : 'center')};
  background: ${({ $hero }) =>
    $hero
      ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, var(--bg-elevated, #141419)), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, var(--bg-elevated, #141419)))'
      : undefined};
  border-color: ${({ $hero }) =>
    $hero ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent)' : undefined};

  @media (max-width: 768px) {
    min-height: ${({ $hero }) => ($hero ? '118px' : '92px')};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

const QuickActionIcon = styled.div<{ $accent: string; $priority?: boolean; $hero?: boolean }>`
  padding: 0.75rem;
  border-radius: 8px;
  background: color-mix(in srgb, ${p => p.$accent} ${p => (p.$hero ? '20%' : '14%')}, transparent);
  color: ${p => p.$accent};
  margin-bottom: 0.5rem;
  line-height: 0;
  ${({ $priority }) => $priority ? 'box-shadow: 0 0 18px color-mix(in srgb, currentColor 16%, transparent);' : ''}
`;

const ActionOverline = styled.span`
  color: var(--accent-gold, #C6A84B);
  font: 800 0.68rem/1 'Fira Code', monospace;
  letter-spacing: 0;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
`;

const ActionTitle = styled.h4<{ $priority?: boolean }>`
  margin: 0 0 0.25rem 0;
  font-size: ${({ $priority }) => ($priority ? '0.95rem' : '0.8rem')};
  font-weight: ${({ $priority }) => ($priority ? 800 : 600)};
  text-align: ${({ $priority }) => ($priority ? 'left' : 'center')};
`;

const ActionDescription = styled.p`
  margin: 0;
  font-size: 0.7rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  text-align: center;
`;

const AdminQuickActions: React.FC<AdminQuickActionsProps> = ({ actions }) => {
  const theme = useTheme() as any;
  const accent = theme?.colors?.accent || 'var(--accent-primary, #60C0F0)';
  const todayFlowActions = TODAY_FLOW_ACTION_ORDER
    .map((id) => actions.find(action => action.id === id))
    .filter((action): action is AdminQuickAction => Boolean(action));
  const secondaryActions = actions.filter(action => !PRIMARY_ACTION_IDS.has(action.id));

  const renderAction = (
    action: AdminQuickAction,
    tier: 'hero' | 'daily' | 'operation' = 'operation',
    stepNumber?: number,
  ) => {
    const priority = tier !== 'operation';
    const overline = stepNumber ? `Step ${stepNumber}` : null;

    return (
    <QuickActionCard
      as={motion.button}
      type="button"
      key={action.id}
      $priority={priority}
      $hero={tier === 'hero'}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={action.action}
      aria-label={stepNumber
        ? `Step ${stepNumber}: ${action.title}: ${action.description}`
        : `${action.title}: ${action.description}`}
    >
      <QuickActionIcon $accent={accent} $priority={priority} $hero={tier === 'hero'} aria-hidden="true">
        {action.icon}
      </QuickActionIcon>
      {overline && <ActionOverline>{overline}</ActionOverline>}
      <ActionTitle $priority={priority}>{action.title}</ActionTitle>
      <ActionDescription>{action.description}</ActionDescription>
    </QuickActionCard>
    );
  };

  return (
    <QuickActionsWrapper>
      <QuickActionsHeader>
        <QuickActionsTitle>First Moves</QuickActionsTitle>
        <QuickActionsKicker>Admin Command</QuickActionsKicker>
      </QuickActionsHeader>
      <TodayFlowList aria-label="Admin today flow">
        {todayFlowActions.map((action, index) => (
          <TodayFlowStep key={action.id} $hero={index === 0}>
            {renderAction(action, index === 0 ? 'hero' : 'daily', index + 1)}
          </TodayFlowStep>
        ))}
      </TodayFlowList>
      <SecondaryActionGroup>
        <ActionGroupLabel>Operations</ActionGroupLabel>
        <QuickActionsGrid aria-label="Admin operations">
          {secondaryActions.map(action => renderAction(action))}
        </QuickActionsGrid>
      </SecondaryActionGroup>
    </QuickActionsWrapper>
  );
};

export default AdminQuickActions;
