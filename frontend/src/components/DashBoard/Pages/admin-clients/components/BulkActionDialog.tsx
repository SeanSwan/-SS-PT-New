import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import Modal from '../../../../UniversalMasterSchedule/ui/CustomModal';

interface BulkActionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedClients: string[];
  onAction: (action: BulkAction) => void;
}

interface BulkAction {
  type:
    | 'message'
    | 'email'
    | 'phone'
    | 'assign_trainer'
    | 'assign_program'
    | 'create_sessions'
    | 'update_status'
    | 'export_data'
    | 'send_assessment'
    | 'bulk_notification'
    | 'progress_report'
    | 'deactivate'
    | 'reset_password';
  data: any;
  targetClients: string[];
}

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: rgba(255, 255, 255, 0.85);
`;

const Description = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.95rem;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
`;

const ActionCard = styled.button<{ $active?: boolean }>`
  background: ${(props) =>
    props.$active ? 'rgba(0, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.8)'};
  border: 1px solid ${(props) =>
    props.$active ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.12)'};
  border-radius: 12px;
  padding: 0.85rem 1rem;
  text-align: left;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: rgba(0, 255, 255, 0.6);
  }
`;

const ActionTitle = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const ActionMeta = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldLabel = styled.label`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
`;

const TextArea = styled.textarea`
  min-height: 110px;
  border-radius: 10px;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.8);
  color: rgba(255, 255, 255, 0.9);
  resize: vertical;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.6);
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
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(0, 255, 255, 0.6);
  }
`;

const BulkActionDialog: React.FC<BulkActionDialogProps> = ({
  open,
  onClose,
  selectedClients,
  onAction
}) => {
  const [selectedAction, setSelectedAction] = useState<BulkAction['type'] | ''>('');
  const [note, setNote] = useState('');

  const actionOptions = useMemo(
    () => [
      { type: 'message', label: 'Message', description: 'Send in-app updates.' },
      { type: 'email', label: 'Email', description: 'Send email notifications.' },
      { type: 'bulk_notification', label: 'Push', description: 'Send push alerts.' },
      { type: 'assign_trainer', label: 'Assign Trainer', description: 'Assign a trainer.' },
      { type: 'assign_program', label: 'Assign Program', description: 'Assign a workout plan.' },
      { type: 'update_status', label: 'Update Status', description: 'Change client status.' },
      { type: 'progress_report', label: 'Progress Report', description: 'Generate reports.' },
      { type: 'export_data', label: 'Export Data', description: 'Export client data.' }
    ],
    []
  );

  const canSubmit = selectedClients.length > 0 && Boolean(selectedAction);

  const handleSubmit = () => {
    if (!canSubmit || !selectedAction) return;
    onAction({
      type: selectedAction,
      data: { note },
      targetClients: selectedClients
    });
    setSelectedAction('');
    setNote('');
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Bulk Actions"
      footer={
        <ButtonRow>
          <Button $variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button $variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            Run Action
          </Button>
        </ButtonRow>
      }
      size="lg"
    >
      <Content>
        <Description>
          {selectedClients.length} client{selectedClients.length === 1 ? '' : 's'} selected.
          Choose an action to apply to the group.
        </Description>

        <ActionGrid>
          {actionOptions.map((option) => (
            <ActionCard
              key={option.type}
              type="button"
              $active={selectedAction === option.type}
              onClick={() => setSelectedAction(option.type)}
            >
              <ActionTitle>{option.label}</ActionTitle>
              <ActionMeta>{option.description}</ActionMeta>
            </ActionCard>
          ))}
        </ActionGrid>

        <FieldGroup>
          <FieldLabel htmlFor="bulk-action-note">Action details</FieldLabel>
          <TextArea
            id="bulk-action-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a short note or instructions for this action."
          />
        </FieldGroup>
      </Content>
    </Modal>
  );
};

export default BulkActionDialog;
