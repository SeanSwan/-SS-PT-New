/**
 * AdminOnboardingResetConfirmDialog
 * =================================
 * In-app confirmation dialog for resetting an admin client's onboarding draft.
 * Keeps destructive reset confirmation accessible and mobile-safe without
 * relying on browser-native window.confirm.
 */

import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminOnboardingResetConfirmDialogProps {
  title: string;
  cancelLabel: string;
  clientName: string;
  resetting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DialogLayer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1310;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(3, 7, 18, 0.72);
  backdrop-filter: blur(6px);
`;

const DialogCard = styled.div`
  width: min(100%, 420px);
  border-radius: 12px;
  border: 1px solid var(--border-accent, rgba(139, 92, 246, 0.35));
  background: var(--modal-bg, rgba(20, 20, 25, 0.98));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  padding: 1.25rem;
  color: var(--text-primary, #e0ecf4);
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const WarningIcon = styled(AlertTriangle)`
  flex: 0 0 auto;
  color: var(--status-warning, #c6a84b);
`;

const DialogTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  font-size: 1.1rem;
  line-height: 1.3;
`;

const DialogCopy = styled.p`
  margin: 0;
  color: var(--text-secondary, #cbd5e1);
  line-height: 1.5;
`;

const ActionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1.25rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const BaseButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const CancelButton = styled(BaseButton)`
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
  background: var(--surface-muted, rgba(255, 255, 255, 0.06));
  color: var(--text-primary, #e0ecf4);
`;

const ResetButton = styled(BaseButton)`
  border: 1px solid var(--danger-border, rgba(255, 100, 100, 0.4));
  background: var(--danger-bg, rgba(255, 50, 50, 0.12));
  color: var(--danger-text, #ff8585);
`;

const AdminOnboardingResetConfirmDialog: React.FC<AdminOnboardingResetConfirmDialogProps> = ({
  title,
  cancelLabel,
  clientName,
  resetting,
  onCancel,
  onConfirm,
}) => (
  <DialogLayer onClick={(event) => event.stopPropagation()}>
    <DialogCard role="dialog" aria-modal="true" aria-label={title}>
      <DialogHeader>
        <WarningIcon size={24} aria-hidden="true" />
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogCopy>
        This deletes saved onboarding progress for {clientName}. The client account, workout history, and session records stay intact.
      </DialogCopy>
      <ActionRow>
        <CancelButton type="button" onClick={onCancel}>
          {cancelLabel}
        </CancelButton>
        <ResetButton type="button" onClick={onConfirm} disabled={resetting}>
          <RefreshCw size={16} aria-hidden="true" />
          {resetting ? 'Resetting...' : 'Reset onboarding'}
        </ResetButton>
      </ActionRow>
    </DialogCard>
  </DialogLayer>
);

export default AdminOnboardingResetConfirmDialog;
