import React, { useState } from 'react';
import styled from 'styled-components';
import Modal from '../../../../UniversalMasterSchedule/ui/CustomModal';

interface ClientAssessmentModalProps {
  open: boolean;
  onClose: () => void;
  client: {
    id?: string;
    firstName?: string;
    lastName?: string;
  };
  onSubmit: (assessment: { notes: string }) => void;
}

const NotesField = styled.textarea`
  width: 100%;
  min-height: 160px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 23, 42, 0.8);
  color: rgba(255, 255, 255, 0.9);
  padding: 0.75rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  border: 1px solid
    ${(props) =>
      props.$variant === 'primary'
        ? 'rgba(0, 255, 255, 0.6)'
        : 'rgba(255, 255, 255, 0.2)'};
  background: ${(props) =>
    props.$variant === 'primary'
      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.35), rgba(120, 81, 169, 0.4))'
      : 'transparent'};
  color: ${(props) =>
    props.$variant === 'primary' ? '#0a0a1a' : 'rgba(255, 255, 255, 0.85)'};
  font-weight: 600;
  cursor: pointer;
`;

const ClientAssessmentModal: React.FC<ClientAssessmentModalProps> = ({
  open,
  onClose,
  client,
  onSubmit
}) => {
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({ notes });
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Assessment Notes${client?.firstName ? ` - ${client.firstName}` : ''}`}
      size="lg"
      footer={
        <ButtonRow>
          <Button $variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button $variant="primary" onClick={handleSubmit}>
            Save Notes
          </Button>
        </ButtonRow>
      }
    >
      <NotesField
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Capture assessment notes, observations, and follow-up recommendations."
      />
    </Modal>
  );
};

export default ClientAssessmentModal;
