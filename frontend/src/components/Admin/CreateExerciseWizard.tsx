import React from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

interface CreateExerciseWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Multi-step wizard for creating exercises with video integration
 *
 * Steps:
 * 1. Basic Info (name, description, muscles, equipment)
 * 2. Video Upload (file upload, YouTube link, or select existing)
 * 3. NASM Tags (phases, movement patterns, acute variables)
 * 4. Preview & Submit
 *
 * TODO: Implement full wizard functionality
 */
const CreateExerciseWizard: React.FC<CreateExerciseWizardProps> = ({ onClose, onSuccess }) => {
  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Create Exercise</Title>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>

        <Content>
          <PlaceholderText>
            🚧 Create Exercise Wizard - Coming Soon!
          </PlaceholderText>
          <PlaceholderDescription>
            This will be a 4-step wizard to create exercises with video integration.
            <br /><br />
            Features:
            <ul>
              <li>Basic information form</li>
              <li>Video upload or YouTube linking</li>
              <li>NASM phase tagging</li>
              <li>Preview and submit</li>
            </ul>
          </PlaceholderDescription>
        </Content>

        <Footer>
          <CancelButton onClick={onClose}>Close</CancelButton>
        </Footer>
      </Modal>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: var(--dark-bg, #0a0e1a);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #FFFFFF);
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #B8B8B8);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: var(--primary-cyan, #00CED1);
  }
`;

const Content = styled.div`
  padding: 24px;
  text-align: center;
`;

const PlaceholderText = styled.div`
  font-size: 32px;
  color: var(--primary-cyan, #00CED1);
  margin-bottom: 16px;
`;

const PlaceholderDescription = styled.div`
  font-size: 16px;
  color: var(--text-secondary, #B8B8B8);
  line-height: 1.6;

  ul {
    text-align: left;
    max-width: 400px;
    margin: 16px auto 0;
  }

  li {
    margin-bottom: 8px;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const CancelButton = styled.button`
  background: transparent;
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-cyan, #00CED1);
    background: var(--glass-bg, rgba(0, 206, 209, 0.1));
  }
`;

export default CreateExerciseWizard;
