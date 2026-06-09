import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import GlowButton from '../../../ui/buttons/GlowButton';
import OrientationIntakeWidget from '../admin-dashboard/components/OrientationIntakeWidget';

const Container = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: clamp(1rem, 2vw, 2rem);
`;

const Header = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1.5rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    align-items: start;
  }
`;

const Title = styled.h1`
  margin: 0 0 0.75rem 0;
  color: var(--text-primary, #E0ECF4);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  line-height: 1.05;
`;

const Copy = styled.p`
  max-width: 680px;
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.82));
  line-height: 1.6;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`;

const UnifiedOnboardingWizard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Header>
        <div>
          <Title>Unified Onboarding</Title>
          <Copy>
            Review orientation submissions, approve matched clients, and route new intake work into the Client Hub.
          </Copy>
        </div>
        <Actions>
          <GlowButton
            text="Go to Client Hub"
            variant="cosmic"
            onClick={() => navigate('/dashboard/admin/client-management')}
          />
        </Actions>
      </Header>
      <OrientationIntakeWidget limit={50} showOpenQueueAction={false} />
    </Container>
  );
};

export default UnifiedOnboardingWizard;
