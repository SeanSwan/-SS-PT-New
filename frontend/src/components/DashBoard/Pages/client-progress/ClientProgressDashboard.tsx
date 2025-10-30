import React, { useState } from 'react';
import styled from 'styled-components';
import {
  PageContainer,
  PageTitle,
  BodyText,
  Card,
  PrimaryButton,
  OutlinedButton
} from '../../../ui-kit';

// Import the admin-client-progress view
import AdminClientProgressView from '../admin-client-progress/admin-client-progress-view.V2.tsx';

// Import the TrainerClientProgressView to reuse components
import ClientProgressView from '../../../TrainerDashboard/ClientProgress/ClientProgressView';

// ==========================================
// STYLED COMPONENTS
// ==========================================

const DashboardWrapper = styled(PageContainer)`
  padding: 1.5rem;
`;

const HeaderSection = styled.div`
  margin-bottom: 1.5rem;
`;

const Description = styled(BodyText)`
  color: ${({ theme }) => theme.colors?.text?.secondary || '#94a3b8'};
  margin-top: 0.5rem;
`;

const ViewSwitcherCard = styled(Card)`
  margin-bottom: 1.5rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

/**
 * ClientProgressDashboard Component
 *
 * Admin-level dashboard for viewing client progress across the platform
 * Integrates with the existing admin client progress view or uses the trainer view
 * depending on selected tab view. Both views share the same MCP hooks for data
 * consistency, and the enhanced view uses the same component structure as the trainer
 * view for a consistent user experience across roles.
 *
 * MUI → UI Kit Conversion: Phase 1 Pilot (2025-10-29)
 * Converted from MUI to styled-components with Galaxy-Swan theme integration
 */
const ClientProgressDashboard: React.FC = () => {
  // Default to enhanced view to match the trainer view for consistency
  const [viewMode, setViewMode] = useState<'classic' | 'enhanced'>('enhanced');

  return (
    <DashboardWrapper>
      <HeaderSection>
        <PageTitle>Client Progress Dashboard</PageTitle>
        <Description>
          Monitor and manage client progression through the SwanStudios fitness platform.
          This dashboard is synchronized with the trainer dashboard through MCP integration
          for consistent data and functionality across user roles.
        </Description>
      </HeaderSection>

      <ViewSwitcherCard>
        <BodyText>
          Choose your preferred view mode (Enhanced view matches Trainer Dashboard):
        </BodyText>

        <ButtonGroup>
          {viewMode === 'classic' ? (
            <PrimaryButton onClick={() => setViewMode('classic')}>
              Classic View
            </PrimaryButton>
          ) : (
            <OutlinedButton onClick={() => setViewMode('classic')}>
              Classic View
            </OutlinedButton>
          )}

          {viewMode === 'enhanced' ? (
            <PrimaryButton onClick={() => setViewMode('enhanced')}>
              Enhanced View
            </PrimaryButton>
          ) : (
            <OutlinedButton onClick={() => setViewMode('enhanced')}>
              Enhanced View
            </OutlinedButton>
          )}
        </ButtonGroup>
      </ViewSwitcherCard>

      {viewMode === 'classic' ? (
        <AdminClientProgressView />
      ) : (
        <ClientProgressView />
      )}
    </DashboardWrapper>
  );
};

export default ClientProgressDashboard;
