import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import GlowButton from '../../../ui/buttons/GlowButton';
import { useAuth } from '../../../../context/AuthContext';
import ClientOnboardingWizard from './components/ClientOnboardingWizard';
import Modal from '../../../UniversalMasterSchedule/ui/CustomModal';

const DashboardContainer = styled.div`
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  color: rgba(255, 255, 255, 0.9);
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
`;

const Subtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  max-width: 720px;
  line-height: 1.6;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const Card = styled.div`
  background: rgba(10, 12, 22, 0.75);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 150px;
`;

const CardTitle = styled.div`
  font-weight: 600;
  color: #00ffff;
`;

const CardBody = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  line-height: 1.5;
`;

const StatusPill = styled.div`
  align-self: flex-start;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  color: #0a0a1a;
  background: linear-gradient(135deg, #00ffff, #7851a9);
`;

const EmptyState = styled.div`
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(0, 255, 255, 0.25);
  border-radius: 16px;
  padding: 1.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
`;

const ClientManagementDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const isAllowed = user?.role === 'admin' || user?.role === 'trainer';

  if (!isAllowed) {
    return (
      <DashboardContainer>
        <Title>Client Management</Title>
        <EmptyState>You do not have access to this dashboard.</EmptyState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <Title>Client Management Hub</Title>
        <Subtitle>
          Manage client onboarding, assignments, and health records. Use the quick actions
          below or open the advanced client workspace for deeper controls.
        </Subtitle>
        {clientId && (
          <StatusPill>Viewing client ID: {clientId}</StatusPill>
        )}
      </Header>

      <ActionRow>
        <GlowButton
          text="Start Client Onboarding"
          variant="cosmic"
          size="large"
          onClick={() => setShowOnboarding(true)}
        />
        <GlowButton
          text="Open Advanced Client Workspace"
          variant="primary"
          size="large"
          onClick={() => navigate('/client-details')}
        />
      </ActionRow>

      <CardGrid>
        <Card>
          <CardTitle>Onboarding Status</CardTitle>
          <CardBody>
            Create new client profiles and capture assessment data through the onboarding
            wizard. This keeps intake data consistent with Coach Cortex requirements.
          </CardBody>
          <StatusPill>Ready</StatusPill>
        </Card>
        <Card>
          <CardTitle>Assignments</CardTitle>
          <CardBody>
            Assign trainers and track session availability. Use the advanced workspace for
            bulk updates and roster changes.
          </CardBody>
          <StatusPill>In Progress</StatusPill>
        </Card>
        <Card>
          <CardTitle>Progress Oversight</CardTitle>
          <CardBody>
            Review client progress summaries, NASM assessments, and recent measurements from
            the progress dashboards.
          </CardBody>
          <StatusPill>Live</StatusPill>
        </Card>
      </CardGrid>

      <EmptyState>
        Need deeper controls such as bulk actions, messaging, or analytics? Open the advanced
        client workspace to manage those areas.
      </EmptyState>

      <Modal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        title="Client Onboarding"
        size="lg"
      >
        <ClientOnboardingWizard
          embedded
          onComplete={() => setShowOnboarding(false)}
          onCancel={() => setShowOnboarding(false)}
        />
      </Modal>
    </DashboardContainer>
  );
};

export default ClientManagementDashboard;
