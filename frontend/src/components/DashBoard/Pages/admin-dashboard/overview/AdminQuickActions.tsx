import React from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import { motion } from 'framer-motion';
import { CommandCard } from '../AdminDashboardCards';
import { AdminQuickAction } from './AdminOverview.types';

interface AdminQuickActionsProps {
  actions: AdminQuickAction[];
}

const QuickActionsWrapper = styled(CommandCard)`
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const QuickActionsTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  @media (max-width: 375px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
`;

const QuickActionCard = styled(CommandCard)`
  appearance: none;
  width: 100%;
  padding: 1.5rem;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  cursor: pointer;

  @media (max-width: 768px) {
    padding: 0.75rem;
    min-height: 90px;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

const QuickActionIcon = styled.div<{ $accent: string }>`
  padding: 0.75rem;
  border-radius: 8px;
  background: color-mix(in srgb, ${p => p.$accent} 14%, transparent);
  color: ${p => p.$accent};
  margin-bottom: 0.5rem;
  line-height: 0;
`;

const ActionTitle = styled.h4`
  margin: 0 0 0.25rem 0;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
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
  return (
    <QuickActionsWrapper>
      <QuickActionsTitle>Quick Actions</QuickActionsTitle>
      <QuickActionsGrid>
        {actions.map((action) => (
          <QuickActionCard
            as={motion.button}
            type="button"
            key={action.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.action}
            aria-label={`${action.title}: ${action.description}`}
          >
            <QuickActionIcon $accent={accent} aria-hidden="true">
              {action.icon}
            </QuickActionIcon>
            <ActionTitle>{action.title}</ActionTitle>
            <ActionDescription>{action.description}</ActionDescription>
          </QuickActionCard>
        ))}
      </QuickActionsGrid>
    </QuickActionsWrapper>
  );
};

export default AdminQuickActions;
