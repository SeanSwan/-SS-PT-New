import React from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
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
  padding: 1.5rem;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    padding: 0.75rem;
    min-height: 90px;
  }
`;

const AdminQuickActions: React.FC<AdminQuickActionsProps> = ({ actions }) => {
  const theme = useTheme() as any;
  const accent = theme?.colors?.accent || '#00ffff';
  return (
    <QuickActionsWrapper>
      <QuickActionsTitle>Quick Actions</QuickActionsTitle>
      <QuickActionsGrid>
        {actions.map((action) => (
          <QuickActionCard
            key={action.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.action}
          >
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '10px',
                background: `${accent}1a`,
                color: accent,
                marginBottom: '0.5rem',
              }}
            >
              {action.icon}
            </div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>{action.title}</h4>
            <p style={{ margin: 0, fontSize: '0.7rem', color: theme?.text?.muted || 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
              {action.description}
            </p>
          </QuickActionCard>
        ))}
      </QuickActionsGrid>
    </QuickActionsWrapper>
  );
};

export default AdminQuickActions;
