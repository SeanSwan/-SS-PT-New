/**
 * ConfirmActionDialog
 * ===================
 * Shared dark-first confirmation dialog for destructive or irreversible actions.
 * Replaces browser-native confirm prompts with accessible, themed UI.
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmActionDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #030712) 78%, transparent);
  backdrop-filter: blur(10px);
`;

const Dialog = styled.div`
  width: min(100%, 440px);
  border-radius: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.24));
  background: var(--bg-surface, #141419);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  color: var(--text-primary, #e0ecf4);
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const IconWrap = styled.div<{ $tone: 'danger' | 'warning' }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: ${({ $tone }) =>
    $tone === 'danger' ? 'var(--danger, #c92a54)' : 'var(--accent-gold, #c6a84b)'};
  background: ${({ $tone }) =>
    $tone === 'danger'
      ? 'color-mix(in srgb, var(--danger, #c92a54) 14%, transparent)'
      : 'color-mix(in srgb, var(--accent-gold, #c6a84b) 14%, transparent)'};
`;

const TitleBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1rem;
  line-height: 1.3;
`;

const Message = styled.p`
  margin: 0.5rem 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-size: 0.9rem;
  line-height: 1.55;
`;

const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  cursor: pointer;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
  }
`;

const ActionButton = styled.button<{ $primary?: boolean; $tone: 'danger' | 'warning' }>`
  min-height: 44px;
  min-width: 44px;
  border-radius: 10px;
  padding: 0 1rem;
  border: 1px solid ${({ $primary, $tone }) =>
    $primary
      ? ($tone === 'danger'
        ? 'color-mix(in srgb, var(--danger, #c92a54) 48%, transparent)'
        : 'color-mix(in srgb, var(--accent-gold, #c6a84b) 48%, transparent)')
      : 'var(--border-soft, rgba(96, 192, 240, 0.2))'};
  background: ${({ $primary, $tone }) =>
    $primary
      ? ($tone === 'danger'
        ? 'color-mix(in srgb, var(--danger, #c92a54) 18%, var(--bg-elevated, #1a1a24))'
        : 'color-mix(in srgb, var(--accent-gold, #c6a84b) 18%, var(--bg-elevated, #1a1a24))')
      : 'var(--bg-elevated, #1a1a24)'};
  color: ${({ $primary, $tone }) =>
    $primary
      ? ($tone === 'danger' ? 'var(--danger, #c92a54)' : 'var(--accent-gold, #c6a84b)')
      : 'var(--text-primary, #e0ecf4)'};
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`;

const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'warning',
  busy = false,
  onCancel,
  onConfirm,
}) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      onCancel();
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !busy) onCancel();
  };

  return (
    <Overlay onMouseDown={handleOverlayClick}>
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDown}
      >
        <Header>
          <IconWrap $tone={tone} aria-hidden="true">
            <AlertTriangle size={20} />
          </IconWrap>
          <TitleBlock>
            <Title>{title}</Title>
            <Message>{message}</Message>
          </TitleBlock>
          <CloseButton type="button" onClick={onCancel} disabled={busy} aria-label="Close confirmation">
            <X size={18} />
          </CloseButton>
        </Header>
        <Actions>
          <ActionButton type="button" ref={cancelRef} onClick={onCancel} disabled={busy} $tone={tone}>
            {cancelLabel}
          </ActionButton>
          <ActionButton type="button" onClick={onConfirm} disabled={busy} $primary $tone={tone}>
            {confirmLabel}
          </ActionButton>
        </Actions>
      </Dialog>
    </Overlay>
  );
};

export default ConfirmActionDialog;
