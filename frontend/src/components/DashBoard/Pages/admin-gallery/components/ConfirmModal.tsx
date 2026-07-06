/**
 * ConfirmModal — themed replacement for window.confirm
 * ====================================================
 * Accessible confirm dialog (Escape + backdrop close, focus on cancel).
 * Driven by a `request` object; the parent owns the open/close state.
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { DangerButton, GhostButton, PrimaryButton } from '../styles';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
}

interface Props {
  request: ConfirmRequest | null;
  onClose: () => void;
}

const ConfirmModal: React.FC<Props> = ({ request, onClose }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return undefined;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request, onClose]);

  if (!request) return null;

  const confirmAndClose = () => {
    request.onConfirm();
    onClose();
  };

  const Confirm = request.tone === 'danger' ? DangerButton : PrimaryButton;

  return (
    <Backdrop onClick={onClose}>
      <Dialog role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <TitleRow $danger={request.tone === 'danger'}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span id="confirm-title">{request.title}</span>
        </TitleRow>
        <Message>{request.message}</Message>
        <Actions>
          <GhostButton ref={cancelRef} type="button" onClick={onClose}>
            {request.cancelLabel || 'Cancel'}
          </GhostButton>
          <Confirm type="button" onClick={confirmAndClose}>
            {request.confirmLabel}
          </Confirm>
        </Actions>
      </Dialog>
    </Backdrop>
  );
};

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(3, 7, 18, 0.66);
  backdrop-filter: blur(3px);
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 420px;
  background: var(--card-bg, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const TitleRow = styled.h3<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 1.1rem;
  color: ${({ $danger }) => ($danger ? 'var(--danger, #e5484d)' : 'var(--text-primary, #e0ecf4)')};
`;

const Message = styled.p`
  margin: 0 0 1.25rem;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--text-muted, #8fa3b8);
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

export default ConfirmModal;
