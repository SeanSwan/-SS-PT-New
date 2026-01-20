import React from 'react';
import styled from 'styled-components';
import GlowButton from '../ui/buttons/GlowButton';

const Container = styled.div`
  padding: 1.5rem;
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.18);
  border-radius: 16px;
`;

const Title = styled.h2`
  margin: 0 0 0.75rem 0;
  color: #ffffff;
  font-size: 1.3rem;
`;

const Description = styled.p`
  margin: 0 0 1.5rem 0;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

interface CreateExerciseWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateExerciseWizard: React.FC<CreateExerciseWizardProps> = ({ onClose, onSuccess }) => {
  return (
    <Container>
      <Title>Create Exercise Wizard</Title>
      <Description>
        The exercise creation workflow is being rebuilt to align with the
        Galaxy-Swan admin tooling and current API patterns. This placeholder
        keeps the route stable while the wizard is reconstructed.
      </Description>
      <Actions>
        <GlowButton text="Close" variant="primary" onClick={onClose} />
        <GlowButton text="Done" variant="cosmic" onClick={onSuccess} />
      </Actions>
    </Container>
  );
};

export default CreateExerciseWizard;
