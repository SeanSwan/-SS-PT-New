import React from 'react';
import styled from 'styled-components';
import { UserPlus, FileText, ClipboardList } from 'lucide-react';

// Import components
import OrientationList from './components/OrientationList';
import NotificationTester from './components/NotificationTester';

// Import accessibility utilities
import { accessibleLabelGenerator } from '../../../../utils/accessibility';

const PageContainer = styled.main`
  flex-grow: 1;
  padding: 24px;
`;

const PageTitle = styled.h1`
  font-size: 2.125rem;
  font-weight: 400;
  color: white;
  margin: 0 0 32px;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ActionCard = styled.div`
  height: 100%;
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s, box-shadow 0.3s;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  }

  &:focus-within {
    outline: 2px solid #00ffff;
  }
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: rgba(0, 255, 255, 0.8);
  }
`;

const CardDescription = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
  flex: 1;
  line-height: 1.6;
`;

const ActionButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: transparent;
  color: #00ffff;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }
`;

const TabContainer = styled.div`
  margin-bottom: 24px;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 12px 24px;
  min-height: 44px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#00ffff' : 'transparent'};
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -2px;

  &:hover {
    color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.9)'};
  }
`;

/**
 * OrientationDashboardView Component
 *
 * Admin dashboard view for managing client orientation submissions
 * Provides overview metrics and detailed list of orientations
 */
const OrientationDashboardView: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  return (
    <PageContainer>
      <PageTitle aria-label={accessibleLabelGenerator('Client Orientation Management')}>
        Client Orientation Management
      </PageTitle>

      {/* Quick Action Cards */}
      <CardsGrid>
        <ActionCard>
          <CardBody>
            <CardTitle>
              <UserPlus size={20} /> Manual Client Entry
            </CardTitle>
            <CardDescription>
              Manually enter a new client orientation form for clients without online access.
            </CardDescription>
            <ActionButton href="/dashboard/client-management/new">
              Add New Client
            </ActionButton>
          </CardBody>
        </ActionCard>

        <ActionCard>
          <CardBody>
            <CardTitle>
              <FileText size={20} /> Orientation Templates
            </CardTitle>
            <CardDescription>
              Customize orientation form templates and questions for new clients.
            </CardDescription>
            <ActionButton href="/dashboard/settings/forms">
              Manage Templates
            </ActionButton>
          </CardBody>
        </ActionCard>

        <ActionCard>
          <CardBody>
            <CardTitle>
              <ClipboardList size={20} /> Export Reports
            </CardTitle>
            <CardDescription>
              Generate and export detailed reports of client orientation data.
            </CardDescription>
            <ActionButton href="/dashboard/reports/orientation">
              Generate Reports
            </ActionButton>
          </CardBody>
        </ActionCard>
      </CardsGrid>

      {/* Tabs */}
      <TabContainer>
        <TabBar role="tablist" aria-label="Orientation Dashboard Tabs">
          <TabButton
            $active={tabValue === 0}
            onClick={() => setTabValue(0)}
            role="tab"
            id="tab-0"
            aria-controls="tabpanel-0"
            aria-selected={tabValue === 0}
          >
            Orientation Submissions
          </TabButton>
          <TabButton
            $active={tabValue === 1}
            onClick={() => setTabValue(1)}
            role="tab"
            id="tab-1"
            aria-controls="tabpanel-1"
            aria-selected={tabValue === 1}
          >
            Notification Testing
          </TabButton>
        </TabBar>
      </TabContainer>

      {/* Tab Panels */}
      <div
        role="tabpanel"
        hidden={tabValue !== 0}
        id="tabpanel-0"
        aria-labelledby="tab-0"
      >
        {tabValue === 0 && <OrientationList />}
      </div>
      <div
        role="tabpanel"
        hidden={tabValue !== 1}
        id="tabpanel-1"
        aria-labelledby="tab-1"
      >
        {tabValue === 1 && <NotificationTester />}
      </div>
    </PageContainer>
  );
};

export default OrientationDashboardView;
