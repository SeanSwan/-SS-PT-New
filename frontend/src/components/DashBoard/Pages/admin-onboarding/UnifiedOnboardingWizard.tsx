import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import GlowButton from '../../../ui/buttons/GlowButton';

const Container = styled.div`
  padding: 2rem;
`;

const Card = styled.div`
  max-width: 720px;
  margin: 0 auto;
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.18);
  border-radius: 20px;
  padding: 2rem;
`;

const Title = styled.h1`
  margin: 0 0 0.75rem 0;
  color: #ffffff;
  font-size: 1.8rem;
`;

const Copy = styled.p`
  margin: 0 0 1.5rem 0;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const UnifiedOnboardingWizard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Card>
        <Title>Unified Onboarding</Title>
        <Copy>
          The unified onboarding flow is being refactored into the Galaxy-Swan
          admin client tools. Use the Client Management dashboard to onboard
          clients until the consolidated wizard is restored.
        </Copy>
        <Actions>
          <GlowButton
            text="Go to Client Management"
            variant="cosmic"
            onClick={() => navigate('/dashboard/admin/clients')}
          />
        </Actions>
      </Card>
    </Container>
  );
};

export default UnifiedOnboardingWizard;
